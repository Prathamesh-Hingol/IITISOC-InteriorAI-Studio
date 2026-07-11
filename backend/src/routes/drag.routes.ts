import { Router } from "express";
import { extractDrag } from "../controllers/drag.controller";

const router = Router();

// POST /api/drag/extract
// Receives image URL + click (x, y), delegates to Python DRAG_ENDPOINT
// Returns { backgroundUrl, cutoutUrl, depthUrl, meta } — all Cloudinary URLs
router.post("/extract", extractDrag);

export default router;
