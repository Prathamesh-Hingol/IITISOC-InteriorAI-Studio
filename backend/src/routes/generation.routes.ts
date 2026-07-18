import { Router } from "express";
import {
  createGeneration,
  createGenerationDepth,
  getGenerationDetail,
  deleteGeneration,
} from "../controllers/generation.controller";
import {
  aiProcessingLimiter,
  generationLimiter,
} from "../middleware/rate-limit";

const router = Router();

router.post("/", generationLimiter, createGeneration);
router.get("/:generationId", getGenerationDetail);
router.post("/:generationId/depth", aiProcessingLimiter, createGenerationDepth);
router.delete("/:generationId", deleteGeneration);

export default router;
