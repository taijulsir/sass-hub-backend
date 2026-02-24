import { Router } from "express";
import multer from "multer";
import { uploadImage } from "../../utils/storage";
import { authenticate } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/api-error";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "Only images are allowed") as any);
    }
  },
});

router.post("/image", authenticate, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, "Please upload an image");
    }

    const folder = (req.query.folder as string) || "general";
    const width = parseInt(req.query.width as string) || 400;
    const height = parseInt(req.query.height as string) || 400;

    const imageUrl = await uploadImage(req.file, folder, width, height);

    res.json({ success: true, message: "Image uploaded successfully", data: { url: imageUrl } });
  } catch (error) {
    next(error);
  }
});

export default router;
