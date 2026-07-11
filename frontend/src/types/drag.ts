// ─── Drag Object Feature — Standalone Types ──────────────────
// All types for the Object Lift & Drag UX feature.
// Completely independent from editor types.

export interface ExtractDragRequest {
  imageUrl: string;
  x: number; // click x in natural image pixel coordinates
  y: number; // click y in natural image pixel coordinates
}

export interface DragObjectMeta {
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  centroid: {
    x: number;
    y: number;
  };
  cutout_size: {
    width: number;
    height: number;
  };
  background_size: {
    width: number;
    height: number;
  };
}

export interface ExtractDragResponse {
  backgroundUrl: string; // Cloudinary URL — LaMa-inpainted clean background
  cutoutUrl: string;     // Cloudinary URL — RGBA feathered object cutout
  depthUrl: string;      // Cloudinary URL — 8-bit grayscale depth map
  meta: DragObjectMeta;
}

export interface DragObjectState {
  isExtracting: boolean;
  result: ExtractDragResponse | null;
  error: string | null;
}
