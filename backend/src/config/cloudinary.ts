import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

/**
 * Uploads a file buffer directly to Cloudinary
 * @param fileBuffer The file buffer from multer
 * @returns Promise with secure_url and public_id
 */
export function uploadToCloudinary(fileBuffer: Buffer): Promise<{ imageUrl: string; imageId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "interior-ai-studio",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (!result) {
          return reject(new Error("Upload failed, empty result from Cloudinary"));
        }
        resolve({
          imageUrl: result.secure_url,
          imageId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}
