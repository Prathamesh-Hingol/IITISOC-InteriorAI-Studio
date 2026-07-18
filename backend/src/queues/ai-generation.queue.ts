import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const AI_GENERATION_QUEUE = "ai-generation";

export type AiGenerationJobData = { generationId: string };

export const aiGenerationQueue = new Queue<AiGenerationJobData>(AI_GENERATION_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: 1_000,
    removeOnFail: 1_000,
  },
});

export async function enqueueGeneration(generationId: string): Promise<void> {
  await aiGenerationQueue.add("generate", { generationId }, {
    jobId: `generation:${generationId}`,
  });
}
