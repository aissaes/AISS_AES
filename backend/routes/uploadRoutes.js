import express from "express";
import multer from "multer";
import { uploadImage, uploadPDF } from "../controllers/uploadController.js";

const uploadRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

uploadRouter.post("/upload-image", upload.single("answer_script"), uploadImage);
uploadRouter.post("/upload-pdf", upload.single("pdf_file"), uploadPDF);

export default uploadRouter;
