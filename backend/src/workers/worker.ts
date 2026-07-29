import http from "http";
import axios, { type AxiosResponse } from "axios";
import { Worker } from "bullmq";
import { prisma } from "../config/db";
import { connectRedis, disconnectRedis, redis } from "../config/redis";
import { AI_GENERATION_QUEUE, type AiGenerationJobData } from "../queues/ai-generation.queue";
import {
  branchJobPayloadSchema,
  editorJobPayloadSchema,
} from "../queues/generation-job.schemas";
import { z } from "zod";

interface ModalResponse { cloudinary_url?: string; output_url?: string; image_url?: string; url?: string }
interface OutputUrlResponse { output_url?: string; cloudinary_url?: string; image_url?: string; url?: string }

async function executeGenerationJob(type: "ROOT" | "BRANCH" | "EDITOR", payload: unknown): Promise<string> {
  console.log(`\n======================================================`);
  console.log(`[Worker EXECUTE] Processing Job Type: ${type}`);
  console.log(`[Worker EXECUTE] Raw Payload:`, JSON.stringify(payload, null, 2));

  if (type === "BRANCH") {
    const endpoint = process.env.GENERATION_ENDPOINT2;
    console.log(`[Worker BRANCH] Target Endpoint: ${endpoint || "NOT CONFIGURED"}`);
    if (!endpoint) throw new Error("GENERATION_ENDPOINT2 is not configured in .env");

    let data;
    try {
      data = branchJobPayloadSchema.parse(payload);
      console.log(`[Worker BRANCH] Payload validated successfully:`, data);
    } catch (zodErr) {
      if (zodErr instanceof z.ZodError) {
        console.error(`[Worker BRANCH ZodError] Validation Failed:`, JSON.stringify(zodErr.errors, null, 2));
      }
      throw zodErr;
    }

    console.log(`[Worker BRANCH] Sending POST to ${endpoint}/generate ...`);
    try {
      const response: AxiosResponse<OutputUrlResponse> = await axios.post(
        `${endpoint}/generate`,
        data,
        { headers: { "Content-Type": "application/json" }, timeout: 300_000 }
      );
      console.log(`[Worker BRANCH] Response Status: ${response.status}`);
      console.log(`[Worker BRANCH] Response Body:`, JSON.stringify(response.data, null, 2));

      const outUrl = response.data.output_url || response.data.cloudinary_url || response.data.image_url || response.data.url;
      if (!outUrl) {
        throw new Error(`BRANCH AI service response missing output_url: ${JSON.stringify(response.data)}`);
      }
      return outUrl;
    } catch (axiosErr: any) {
      console.error(`[Worker BRANCH AxiosError] Request Failed:`, axiosErr.message);
      if (axiosErr.response) {
        console.error(`[Worker BRANCH AxiosError Response Status]:`, axiosErr.response.status);
        console.error(`[Worker BRANCH AxiosError Response Data]:`, JSON.stringify(axiosErr.response.data, null, 2));
      }
      throw axiosErr;
    }
  }

  // EDITOR Job handling
  const endpoint = process.env.SAM_ENDPOINT;
  console.log(`[Worker EDITOR] Target SAM Endpoint: ${endpoint || "NOT CONFIGURED"}`);
  if (!endpoint) throw new Error("SAM_ENDPOINT is not configured in .env");

  let data;
  try {
    data = editorJobPayloadSchema.parse(payload);
    console.log(`[Worker EDITOR] Payload validated successfully:`, JSON.stringify(data, null, 2));
  } catch (zodErr) {
    if (zodErr instanceof z.ZodError) {
      console.error(`[Worker EDITOR ZodError] Validation Failed:`, JSON.stringify(zodErr.errors, null, 2));
    }
    throw zodErr;
  }

  console.log(`[Worker EDITOR] Sending POST to ${endpoint}/generate ...`);
  try {
    const response: AxiosResponse<OutputUrlResponse> = await axios.post(
      `${endpoint}/generate`,
      data,
      { headers: { "Content-Type": "application/json" }, timeout: 300_000 }
    );
    console.log(`[Worker EDITOR] Response Status: ${response.status}`);
    console.log(`[Worker EDITOR] Response Body:`, JSON.stringify(response.data, null, 2));

    const outUrl = response.data.output_url || response.data.cloudinary_url || response.data.image_url || response.data.url;
    if (!outUrl) {
      throw new Error(`EDITOR AI service response missing output_url. Received: ${JSON.stringify(response.data)}`);
    }
    console.log(`[Worker EDITOR] Extracted Output Image URL: ${outUrl}`);

    // SAM session cleanup is now handled by the frontend via POST /editor/clear-selection
    // after the generation is queued (reference_mask: false + reference_mask: true).

    return outUrl;
  } catch (axiosErr: any) {
    console.error(`[Worker EDITOR AxiosError] Request Failed:`, axiosErr.message);
    if (axiosErr.response) {
      console.error(`[Worker EDITOR AxiosError Response Status]:`, axiosErr.response.status);
      console.error(`[Worker EDITOR AxiosError Response Data]:`, JSON.stringify(axiosErr.response.data, null, 2));
    }
    throw axiosErr;
  }
}

const worker = new Worker<AiGenerationJobData>(
  AI_GENERATION_QUEUE,
  async (bullJob) => {
    console.log(`\n======================================================`);
    console.log(`[Worker PICKUP] Received Job ID: ${bullJob.id}`);
    console.log(`[Worker PICKUP] Generation DB ID: ${bullJob.data.generationId}`);

    const generation = await prisma.generation.findUnique({
      where: { id: bullJob.data.generationId },
      include: { job: true },
    });

    if (!generation) {
      console.warn(`[Worker PICKUP] Generation record ${bullJob.data.generationId} not found in database.`);
      return;
    }
    if (!generation.job) {
      console.warn(`[Worker PICKUP] Generation ${generation.id} has no associated GenerationJob record.`);
      return;
    }
    if (generation.job.status === "COMPLETED") {
      console.log(`[Worker PICKUP] Job ${generation.job.id} is already COMPLETED. Skipping.`);
      return;
    }

    console.log(`[Worker DB UPDATE] Updating status to 'processing' for Generation: ${generation.id}`);
    await prisma.$transaction([
      prisma.generation.update({ where: { id: generation.id }, data: { status: "processing" } }),
      prisma.generationJob.update({
        where: { generationId: generation.id },
        data: {
          status: "PROCESSING",
          startedAt: new Date(),
          attempts: { increment: 1 },
          failureMessage: null,
        },
      }),
    ]);

    try {
      const imageUrl = await executeGenerationJob(generation.job.type, generation.job.payload);
      if (!imageUrl) throw new Error("AI service returned no image URL");

      console.log(`[Worker DB SUCCESS] Marking Generation ${generation.id} as COMPLETED. Output: ${imageUrl}`);
      await prisma.$transaction([
        prisma.generation.update({ where: { id: generation.id }, data: { status: "completed", imageUrl } }),
        prisma.generationJob.update({
          where: { generationId: generation.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        }),
      ]);
      console.log(`[Worker SUCCESS] Job ${bullJob.id} finished successfully!`);
    } catch (jobErr: any) {
      console.error(`[Worker ERROR] Execution failed for Generation ${generation.id}:`, jobErr.message);
      throw jobErr;
    }
  },
  { connection: redis.duplicate(), concurrency: 1 }
);

worker.on("completed", (job) => {
  console.log(`[Worker EVENT] Job ${job.id} completed.`);
});

worker.on("failed", async (bullJob, error) => {
  console.error(`[Worker EVENT FAILED] Job ${bullJob?.id} failed with error: ${error.message}`);
  if (!bullJob) return;

  const maxAttempts = bullJob.opts.attempts ?? 1;
  console.log(`[Worker EVENT FAILED] Attempts made: ${bullJob.attemptsMade}/${maxAttempts}`);

  if (bullJob.attemptsMade >= maxAttempts) {
    console.log(`[Worker DB FAIL] Max attempts reached. Marking Generation ${bullJob.data.generationId} as FAILED.`);
    await prisma.$transaction([
      prisma.generation.update({ where: { id: bullJob.data.generationId }, data: { status: "failed" } }),
      prisma.generationJob.update({
        where: { generationId: bullJob.data.generationId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureMessage: error.message,
        },
      }),
    ]).catch((dbErr) => console.error(`[Worker DB FAIL Error]`, dbErr));
  }
});

worker.on("error", (err) => {
  console.error(`[Worker EVENT ERROR] Worker encountered error:`, err);
});

// Minimal HTTP server so Render detects an open port and confirms deployment.
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", worker: "ai-generation", timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

async function start() {
  await prisma.$connect();
  await connectRedis();
  healthServer.listen(PORT, () => {
    console.log(`[Worker HEALTH] Health-check server listening on port ${PORT}`);
  });
  console.log(`[Worker START] AI generation worker initialized and listening on queue '${AI_GENERATION_QUEUE}'.`);
}

void start().catch((error: unknown) => {
  console.error("[Worker START ERROR] AI generation worker failed to start", error);
  process.exit(1);
});

async function shutdown() {
  console.log("[Worker SHUTDOWN] Shutting down worker gracefully...");
  healthServer.close();
  await worker.close();
  await Promise.all([prisma.$disconnect(), disconnectRedis()]);
  process.exit(0);
}
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
