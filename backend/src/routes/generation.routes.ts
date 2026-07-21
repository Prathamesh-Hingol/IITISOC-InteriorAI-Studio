import { Router } from "express";
import {
  createGeneration,
  createGenerationDepth,
  getGenerationDetail,
  deleteGeneration,
} from "../controllers/generation.controller";
import { createGenerationView } from "../controllers/multiview.controller";

const router = Router();

router.post("/", createGeneration);
router.get("/:generationId", getGenerationDetail);
router.post("/:generationId/depth", createGenerationDepth);
router.post("/:generationId/views", createGenerationView);
router.delete("/:generationId", deleteGeneration);

export default router;
