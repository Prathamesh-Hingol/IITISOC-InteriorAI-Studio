import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { redis } from "../config/redis";

function createRedisStore(prefix: string): RedisStore {
  return new RedisStore({
    prefix,
    sendCommand: (command: string, ...args: string[]) =>
      redis.call(command, ...args) as Promise<RedisReply>,
  });
}

function perUserLimiter(
  prefix: string,
  windowMs: number,
  limit: number,
  message: string,
) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => req.currentUser!.id,
    store: createRedisStore(prefix),
    passOnStoreError: false,
    message: {
      error: "Rate limit exceeded",
      message,
    },
  });
}

/** Broad abuse protection before authentication. */
export const globalIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
  store: createRedisStore("rate-limit:ip:"),
  passOnStoreError: false,
  skip: (req) =>
    req.path === "/health" ||
    req.path === "/api/health" ||
    req.path === "/api/ready",
  message: {
    error: "Rate limit exceeded",
    message: "Too many requests from this IP address. Please try again later.",
  },
});

export const uploadLimiter = perUserLimiter(
  "rate-limit:upload:",
  60 * 60 * 1000,
  20,
  "You have reached the upload limit. Please try again later.",
);

export const generationLimiter = perUserLimiter(
  "rate-limit:generation:",
  60 * 60 * 1000,
  10,
  "You have reached the image-generation limit. Please try again later.",
);

export const aiProcessingLimiter = perUserLimiter(
  "rate-limit:ai-processing:",
  60 * 60 * 1000,
  30,
  "You have reached the AI-processing limit. Please try again later.",
);

export const segmentLimiter = perUserLimiter(
  "rate-limit:segment:",
  60 * 60 * 1000,
  120,
  "You have reached the segmentation limit. Please try again later.",
);
