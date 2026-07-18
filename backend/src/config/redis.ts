import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ??
  (process.env.NODE_ENV === "production" ? undefined : "redis://127.0.0.1:6379");

if (!redisUrl) {
  throw new Error("REDIS_URL is required when NODE_ENV is production");
}

/**
 * Shared Redis connection for rate limiting now and BullMQ queues later.
 *
 * Development defaults to the Redis container in docker-compose.redis.yml.
 * Production must provide REDIS_URL, so the application is not coupled to a
 * specific host or Redis provider.
 */
export const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

export async function connectRedis(): Promise<void> {
  if (redis.status === "wait") {
    await redis.connect();
  }

  await redis.ping();
  console.log("Redis connected successfully.");
}

export async function disconnectRedis(): Promise<void> {
  if (redis.status === "ready") {
    await redis.quit();
    return;
  }

  redis.disconnect();
}
