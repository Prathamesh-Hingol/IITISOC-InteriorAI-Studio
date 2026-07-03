import { Router } from "express";
import {
  segment,
  acceptCandidate,
  undoSelection,
  clearSelection,
  generate,
} from "../controllers/editor.controller";

const router = Router();

// POST /api/editor/segment — Request interactive segmentation
router.post("/segment", segment);

// POST /api/editor/accept-candidate — Accept a candidate mask
router.post("/accept-candidate", acceptCandidate);

// POST /api/editor/undo-selection — Undo the last accepted mask
router.post("/undo-selection", undoSelection);

// POST /api/editor/clear-selection — Clear the selection session
router.post("/clear-selection", clearSelection);

// POST /api/editor/generate — Generate final inpaint/furniture edit
router.post("/generate", generate);

export default router;

