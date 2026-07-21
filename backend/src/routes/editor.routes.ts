import { Router } from "express";
import {
  segment,
  acceptCandidate,
  removeClicks,
  clearSelection,
  generate,
  segmentExtract,
} from "../controllers/editor.controller";

const router = Router();

// POST /api/editor/segment — Request interactive segmentation
router.post("/segment", segment);

// POST /api/editor/accept-candidate — Accept a candidate mask
router.post("/accept-candidate", acceptCandidate);

// POST /api/editor/remove-clicks — Remove selected click indices from session
router.post("/remove-clicks", removeClicks);

// POST /api/editor/clear-selection — Clear the selection session
router.post("/clear-selection", clearSelection);

// POST /api/editor/generate — Generate final inpaint/furniture edit
router.post("/generate", generate);

// POST /api/editor/segment/extract — Extract segmented mask for object move
router.post("/segment/extract", segmentExtract);

export default router;
