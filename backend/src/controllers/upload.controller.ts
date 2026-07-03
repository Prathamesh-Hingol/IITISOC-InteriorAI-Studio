import { Request, Response, NextFunction } from "express";
import sharp from "sharp";
import { uploadToCloudinary } from "../config/cloudinary";

/**
 * Normalizes any uploaded image to a consistent size before storing on Cloudinary.
 *
 * Strategy: fit "inside" 1024×1024 — the longest edge is scaled down to 1024px
 * while the shorter edge shrinks proportionally. A portrait 800×1200 image
 * becomes 683×1024; a landscape 1920×1080 becomes 1024×576; a 512×512 square
 * is left unchanged (never upscaled).
 *
 * This guarantees that every image in the system shares the same coordinate
 * space, so SAM always receives the same dimensions the browser painted on.
 */
async function normalizeImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({
      width: 1024,
      height: 1024,
      fit: "inside",        // preserve aspect ratio, never exceed 1024 on either axis
      withoutEnlargement: true, // don't upscale images smaller than 1024
    })
    .jpeg({ quality: 92 }) // normalize format to JPEG for consistency
    .toBuffer();
}

export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided in upload request" });
    }

    // Normalize dimensions before uploading — every image stored at ≤ 1024px
    const normalizedBuffer = await normalizeImage(req.file.buffer);

    const result = await uploadToCloudinary(normalizedBuffer);

    res.status(200).json({
      imageId: result.imageId,
      imageUrl: result.imageUrl,
    });
  } catch (error) {
    next(error);
  }
}
