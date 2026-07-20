import axios, { type AxiosResponse } from "axios";
import { Worker } from "bullmq";
import { prisma } from "../config/db";
import { connectRedis, disconnectRedis, redis } from "../config/redis";
import { AI_GENERATION_QUEUE, type AiGenerationJobData } from "../queues/ai-generation.queue";
import {
  branchJobPayloadSchema,
  editorJobPayloadSchema,
  rootJobPayloadSchema,
} from "../queues/generation-job.schemas";

interface ModalResponse { cloudinary_url: string }
interface OutputUrlResponse { output_url: string }

async function executeGenerationJob(type: "ROOT" | "BRANCH" | "EDITOR", payload: unknown): Promise<string> {
  if (type === "ROOT") {
    const endpoint = process.env.GENERATION_ENDPOINT;
    if (!endpoint) throw new Error("GENERATION_ENDPOINT is not configured");
    const data = rootJobPayloadSchema.parse(payload);
    const response: AxiosResponse<ModalResponse> = await axios.post(
      `${endpoint}/generate`, { prompt: data.prompt }, { timeout: 180_000, headers: { "Content-Type": "application/json" } },
    );
    return response.data.cloudinary_url;
  }

  if (type === "BRANCH") {
    const endpoint = process.env.GENERATION_ENDPOINT2;
    if (!endpoint) throw new Error("GENERATION_ENDPOINT2 is not configured");
    const data = branchJobPayloadSchema.parse(payload);
    const response: AxiosResponse<OutputUrlResponse> = await axios.post(
      `${endpoint}/generate`, data, { timeout: 180_000, headers: { "Content-Type": "application/json" } },
    );
    return response.data.output_url;
  }

  const endpoint = process.env.SAM_ENDPOINT;
  if (!endpoint) throw new Error("SAM_ENDPOINT is not configured");
  const data = editorJobPayloadSchema.parse(payload);
  const response: AxiosResponse<OutputUrlResponse> = await axios.post(
    `${endpoint}/generate`, data, { timeout: 180_000, headers: { "Content-Type": "application/json" } },
  );
  return response.data.output_url;
}

const worker = new Worker<AiGenerationJobData>(AI_GENERATION_QUEUE, async (bullJob) => {
  const generation = await prisma.generation.findUnique({
    where: { id: bullJob.data.generationId },
    include: { job: true },
  });
  if (!generation || !generation.job || generation.job.status === "COMPLETED") return;

  await prisma.$transaction([
    prisma.generation.update({ where: { id: generation.id }, data: { status: "processing" } }),
    prisma.generationJob.update({ where: { generationId: generation.id }, data: {
      status: "PROCESSING", startedAt: new Date(), attempts: { increment: 1 }, failureMessage: null,
    }}),
  ]);

  const imageUrl = await executeGenerationJob(generation.job.type, generation.job.payload);
  if (!imageUrl) throw new Error("AI service returned no image URL");

  await prisma.$transaction([
    prisma.generation.update({ where: { id: generation.id }, data: { status: "completed", imageUrl } }),
    prisma.generationJob.update({ where: { generationId: generation.id }, data: { status: "COMPLETED", completedAt: new Date() } }),
  ]);
}, { connection: redis.duplicate(), concurrency: 1 });

worker.on("failed", async (bullJob, error) => {
  if (!bullJob || bullJob.attemptsMade < (bullJob.opts.attempts ?? 1)) return;
  await prisma.$transaction([
    prisma.generation.update({ where: { id: bullJob.data.generationId }, data: { status: "failed" } }),
    prisma.generationJob.update({ where: { generationId: bullJob.data.generationId }, data: {
      status: "FAILED", failedAt: new Date(), failureMessage: error.message,
    }}),
  ]).catch(() => undefined);
});

async function start() {
  await prisma.$connect();
  await connectRedis();
  console.log("AI generation worker is waiting for jobs.");
}
void start().catch((error: unknown) => {
  console.error("AI generation worker failed to start", error);
  process.exit(1);
});

async function shutdown() {
  await worker.close();
  await Promise.all([prisma.$disconnect(), disconnectRedis()]);
  process.exit(0);
}
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
