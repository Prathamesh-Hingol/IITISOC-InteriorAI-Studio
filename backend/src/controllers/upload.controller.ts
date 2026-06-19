import { Request, Response, NextFunction } from "express";
import { uploadToCloudinary } from "../config/cloudinary";

export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided in upload request" });
    }

    // Upload buffer to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer);

    res.status(200).json({
      imageId: result.imageId,
      imageUrl: result.imageUrl,
    });
  } catch (error) {
    next(error);
  }
}
