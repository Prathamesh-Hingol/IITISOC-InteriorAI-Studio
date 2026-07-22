import { Router } from "express";
import {
  createGeneration,
  createGenerationDepth,
  getGenerationDetail,
  deleteGeneration,
} from "../controllers/generation.controller";

const router = Router();

router.post("/", createGeneration);
router.get("/:generationId", getGenerationDetail);
router.post("/:generationId/depth", createGenerationDepth);
router.delete("/:generationId", deleteGeneration);

export default router;
