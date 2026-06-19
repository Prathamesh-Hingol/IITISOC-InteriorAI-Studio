import { Router } from "express";
import multer from "multer";
import { uploadImage } from "../controllers/upload.controller";

const router = Router();

// Configure multer to use in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit images to 5MB max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image file uploads are supported"));
    }
  },
});

router.post("/", upload.single("image"), uploadImage);

export default router;
