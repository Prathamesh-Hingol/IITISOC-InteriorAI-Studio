import { fetchWithAuth } from "./client";
import type { ExtractDragRequest, ExtractDragResponse } from "../types/drag";

/**
 * Standalone API module for the Object Lift & Drag feature.
 * Calls POST /api/drag/extract — completely separate from editor.api.ts
 */
export const dragApi = {
  /**
   * Sends an image URL + click coordinates to the Python DRAG_ENDPOINT
   * (via the Node.js passthrough controller).
   *
   * Returns 4 Cloudinary URLs:
   *  - backgroundUrl : scene with the clicked object removed (LaMa inpaint)
   *  - cutoutUrl     : RGBA PNG of the isolated object (feathered edges)
   *  - depthUrl      : 8-bit grayscale depth map for auto-scale-by-depth
   *  - meta          : bbox, centroid, sizes in natural image pixel coords
   */
  extract: (
    payload: ExtractDragRequest,
    getToken: () => Promise<string | null>,
  ): Promise<ExtractDragResponse> =>
    fetchWithAuth<ExtractDragResponse>("/drag/extract", getToken, {
      method: "POST",
      body: payload,
    }),
};
