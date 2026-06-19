import { Router } from "express";
import projectRoutes from "./project.routes";
import uploadRoutes from "./upload.routes";
import generationRoutes from "./generation.routes";
import { requireAuthAndSyncUser } from "../middleware/auth";

const router = Router();

// Apply the Clerk JWT Auth and postgres synchronization middleware globally
router.use("/projects", requireAuthAndSyncUser, projectRoutes);
router.use("/uploads", requireAuthAndSyncUser, uploadRoutes);
router.use("/generations", requireAuthAndSyncUser, generationRoutes);

export default router;
