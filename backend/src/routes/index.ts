import { Router } from "express";
import projectRoutes from "./project.routes";
import uploadRoutes from "./upload.routes";
import generationRoutes from "./generation.routes";
import editorRoutes from "./editor.routes";
import dragRoutes from "./drag.routes";
import { requireAuthAndSyncUser } from "../middleware/auth";

const router = Router();

// Apply the Clerk JWT Auth and postgres synchronization middleware globally
router.use("/projects", requireAuthAndSyncUser, projectRoutes);
router.use("/uploads", requireAuthAndSyncUser, uploadRoutes);
router.use("/generations", requireAuthAndSyncUser, generationRoutes);
router.use("/editor", requireAuthAndSyncUser, editorRoutes);
router.use("/drag", requireAuthAndSyncUser, dragRoutes);

// Public health check route for monitoring and avoiding container sleep
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
