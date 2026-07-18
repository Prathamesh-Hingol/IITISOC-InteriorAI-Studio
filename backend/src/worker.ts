import axios from "axios";
import { Worker } from "bullmq";
import { prisma } from "./config/db";
import { connectRedis, disconnectRedis, redis } from "./config/redis";
import { AI_GENERATION_QUEUE, type AiGenerationJobData } from "./queues/ai-generation.queue";

const worker = new Worker<AiGenerationJobData>(AI_GENERATION_QUEUE, async (job) => {
  const generation = await prisma.generation.findUnique({ where: { id: job.data.generationId } });
  if (!generation || generation.status === "completed") return;

  const payload = generation.jobPayload as Record<string, unknown> | null;
  if (!payload || !generation.jobType) throw new Error("Generation job payload is missing");

  await prisma.generation.update({ where: { id: generation.id }, data: {
    status: "processing", startedAt: new Date(), attempts: { increment: 1 }, failureMessage: null,
  }});

  let imageUrl: string | undefined;
  if (generation.jobType === "root") {
    const endpoint = process.env.GENERATION_ENDPOINT;
    if (!endpoint) throw new Error("GENERATION_ENDPOINT is not configured");
    const response = await axios.post(`${endpoint}/generate`, { prompt: payload.prompt }, { timeout: 180_000 });
    imageUrl = response.data?.cloudinary_url;
  } else if (generation.jobType === "branch") {
    const endpoint = process.env.GENERATION_ENDPOINT2;
    if (!endpoint) throw new Error("GENERATION_ENDPOINT2 is not configured");
    const response = await axios.post(`${endpoint}/generate`, payload, { timeout: 180_000 });
    imageUrl = response.data?.output_url;
  } else if (generation.jobType === "editor") {
    const endpoint = process.env.SAM_ENDPOINT;
    if (!endpoint) throw new Error("SAM_ENDPOINT is not configured");
    const response = await axios.post(`${endpoint}/generate`, payload, { timeout: 180_000 });
    imageUrl = response.data?.output_url;
  }
  if (!imageUrl) throw new Error("AI service returned no image URL");

  await prisma.generation.update({ where: { id: generation.id }, data: {
    status: "completed", imageUrl, completedAt: new Date(), jobPayload: undefined,
  }});
}, { connection: redis.duplicate(), concurrency: 1 });

worker.on("failed", async (job, error) => {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
  await prisma.generation.update({ where: { id: job.data.generationId }, data: {
    status: "failed", failedAt: new Date(), failureMessage: error.message,
  }}).catch(() => undefined);
});

async function start() {
  await prisma.$connect();
  await connectRedis();
  console.log("AI generation worker is waiting for jobs.");
}
void start();

async function shutdown() {
  await worker.close();
  await Promise.all([prisma.$disconnect(), disconnectRedis()]);
  process.exit(0);
}
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
