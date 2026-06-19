import { Router } from "express";
import {
  createGeneration,
  getGenerationDetail,
  deleteGeneration,
} from "../controllers/generation.controller";

const router = Router();

router.post("/", createGeneration);
router.get("/:generationId", getGenerationDetail);
router.delete("/:generationId", deleteGeneration);

export default router;
