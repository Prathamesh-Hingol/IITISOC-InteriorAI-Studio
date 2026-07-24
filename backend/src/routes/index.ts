import { Router } from "express";
import projectRoutes from "./project.routes";
import uploadRoutes from "./upload.routes";
import generationRoutes from "./generation.routes";
import editorRoutes from "./editor.routes";
import { requireAuthAndSyncUser } from "../middleware/auth";
import { prisma } from "../config/db";
import { redis } from "../config/redis";

const router = Router();

// Apply the Clerk JWT Auth and postgres synchronization middleware globally
router.use("/projects", requireAuthAndSyncUser, projectRoutes);
router.use("/uploads", requireAuthAndSyncUser, uploadRoutes);
router.use("/generations", requireAuthAndSyncUser, generationRoutes);
router.use("/editor", requireAuthAndSyncUser, editorRoutes);

// Public health check route for monitoring and avoiding container sleep
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness verifies dependencies required to serve authenticated API traffic.
router.get("/ready", async (_req, res) => {
  try {
    await Promise.all([prisma.$queryRaw`SELECT 1`, redis.ping()]);
    res.json({ status: "ready" });
  } catch (error) {
    console.error("Readiness check failed:", error);
    res.status(503).json({ status: "not ready" });
  }
});

export default router;
