import { Router } from "express";
import {
  segment,
  acceptCandidate,
  removeClicks,
  clearSelection,
  generate,
  segmentExtract,
} from "../controllers/editor.controller";
import {
  aiProcessingLimiter,
  generationLimiter,
  segmentLimiter,
} from "../middleware/rate-limit";

const router = Router();

// POST /api/editor/segment — Request interactive segmentation
router.post("/segment", segmentLimiter, segment);

// POST /api/editor/accept-candidate — Accept a candidate mask
router.post("/accept-candidate", segmentLimiter, acceptCandidate);

// POST /api/editor/remove-clicks — Remove selected click indices from session
router.post("/remove-clicks", segmentLimiter, removeClicks);

// POST /api/editor/clear-selection — Clear the selection session
router.post("/clear-selection", segmentLimiter, clearSelection);

// POST /api/editor/generate — Generate final inpaint/furniture edit
router.post("/generate", generationLimiter, generate);

// POST /api/editor/segment/extract — Extract segmented mask for object move
router.post("/segment/extract", aiProcessingLimiter, segmentExtract);

export default router;
