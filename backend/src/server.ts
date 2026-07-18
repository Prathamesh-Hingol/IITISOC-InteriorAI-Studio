import app from "./app";
import { prisma } from "./config/db";
import { connectRedis, disconnectRedis } from "./config/redis";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify Database Connection
    await prisma.$connect();
    console.log("Database connected successfully.");
    await connectRedis();

    const server = app.listen(PORT, () => {
      console.log(`Server is running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Shutting down gracefully.`);
      server.close(async () => {
        await Promise.all([prisma.$disconnect(), disconnectRedis()]);
        process.exit(0);
      });
    };

    process.once("SIGTERM", () => void shutdown("SIGTERM"));
    process.once("SIGINT", () => void shutdown("SIGINT"));
  } catch (error) {
    console.error("Server error", error);
    await Promise.allSettled([prisma.$disconnect(), disconnectRedis()]);
    process.exit(1);
  }
}

startServer();
