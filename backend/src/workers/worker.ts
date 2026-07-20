import axios, { type AxiosResponse } from "axios";
import { Worker } from "bullmq";
import { prisma } from "../config/db";
import { connectRedis, disconnectRedis, redis } from "../config/redis";
import { AI_GENERATION_QUEUE, type AiGenerationJobData } from "../queues/ai-generation.queue";

// ─── Payload Types (mirrored from controllers) ────────────────────────────────

/** Payload stored in DB for a "root" (text-to-image) job */
interface RootJobPayload {
  prompt: string;
}

/** Payload stored in DB for a "branch" (style-restyle) job */
interface BranchJobPayload {
  prompt: string;
  image_url: string;
}

/** Payload stored in DB for an "editor" (SAM inpainting) job */
interface EditorJobPayload {
  prompt: string;
  session_id: string;
  image_url: string;
  mask_url: string;
  reference_image_url: string | null;
  edit_mode: "interior-modification" | "furniture-placement";
  guidance: number;
}

// ─── Response Types (mirrored from controllers) ───────────────────────────────

/** Response from GENERATION_ENDPOINT /generate (FLUX Schnell) */
interface ModalRes {
  status: string;
  cloudinary_url: string;
  public_id: string;
  steps_skipped: number;
}

/** Response from GENERATION_ENDPOINT2 /generate (Kontext branch) */
interface KontextRes {
  output_url: string;
}

/** Response from SAM_ENDPOINT /generate (editor inpainting) */
interface GenerationResponse {
  output_url: string;
}

// ─── Worker ───────────────────────────────────────────────────────────────────

const worker = new Worker<AiGenerationJobData>(AI_GENERATION_QUEUE, async (job) => {
  const generation = await prisma.generation.findUnique({ where: { id: job.data.generationId } });
  if (!generation || generation.status === "completed") return;

  if (!generation.jobPayload || !generation.jobType) {
    throw new Error("Generation job payload is missing");
  }

  await prisma.generation.update({ where: { id: generation.id }, data: {
    status: "processing", startedAt: new Date(), attempts: { increment: 1 }, failureMessage: null,
  }});

  let imageUrl: string | undefined;

  if (generation.jobType === "root") {
    // ── Root: text-to-image via FLUX Schnell ──
    const endpoint = process.env.GENERATION_ENDPOINT;
    if (!endpoint) throw new Error("GENERATION_ENDPOINT is not configured");

    const payload = generation.jobPayload as unknown as RootJobPayload;
    console.log(`[Worker/root] Calling FLUX Schnell for prompt: "${payload.prompt}"`);

    const response: AxiosResponse<ModalRes> = await axios.post<ModalRes>(
      `${endpoint}/generate`,
      { prompt: payload.prompt },
      { timeout: 180_000, headers: { "Content-Type": "application/json" } },
    );
    imageUrl = response.data.cloudinary_url;

  } else if (generation.jobType === "branch") {
    // ── Branch: style-restyle via Kontext ──
    const endpoint = process.env.GENERATION_ENDPOINT2;
    if (!endpoint) throw new Error("GENERATION_ENDPOINT2 is not configured");

    const payload = generation.jobPayload as unknown as BranchJobPayload;
    console.log(`[Worker/branch] Calling Kontext for prompt: "${payload.prompt}"`);

    const response: AxiosResponse<KontextRes> = await axios.post<KontextRes>(
      `${endpoint}/generate`,
      payload,
      { timeout: 180_000, headers: { "Content-Type": "application/json" } },
    );
    imageUrl = response.data.output_url;

  } else if (generation.jobType === "editor") {
    // ── Editor: SAM-based inpainting ──
    const endpoint = process.env.SAM_ENDPOINT;
    if (!endpoint) throw new Error("SAM_ENDPOINT is not configured");

    const payload = generation.jobPayload as unknown as EditorJobPayload;
    console.log(`[Worker/editor] Calling SAM inpainting for session: "${payload.session_id}"`);

    const response: AxiosResponse<GenerationResponse> = await axios.post<GenerationResponse>(
      `${endpoint}/generate`,
      payload,
      { timeout: 180_000, headers: { "Content-Type": "application/json" } },
    );
    imageUrl = response.data.output_url;
  }

  if (!imageUrl) throw new Error("AI service returned no image URL");

  await prisma.generation.update({ where: { id: generation.id }, data: {
    status: "completed", imageUrl, completedAt: new Date(), jobPayload: undefined,
  }});

}, { connection: redis.duplicate(), concurrency: 1 });

// ─── Event Handlers ───────────────────────────────────────────────────────────

worker.on("failed", async (job, error) => {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
  await prisma.generation.update({ where: { id: job.data.generationId }, data: {
    status: "failed", failedAt: new Date(), failureMessage: error.message,
  }}).catch(() => undefined);
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

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
