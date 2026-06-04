import express from "express";
import multer from "multer";
import { uploadImage, uploadPDF } from "../controllers/uploadController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const uploadRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

uploadRouter.post("/upload-image", verifyToken, upload.single("answer_script"), uploadImage);
uploadRouter.post("/upload-pdf", verifyToken, upload.single("pdf_file"), uploadPDF);

export default uploadRouter;
