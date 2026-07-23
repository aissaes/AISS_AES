import express from "express";
import { uploadImage, uploadPDF, getAuthenticationParameters } from "../controllers/common/uploadController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { uploadImageInstance, uploadPdfInstance } from "../middlewares/uploadMiddleware.js";

const uploadRouter = express.Router();

uploadRouter.post("/upload-image", verifyToken, uploadImageInstance.single("answer_script"), uploadImage);
uploadRouter.post("/upload-pdf", verifyToken, uploadPdfInstance.single("pdf_file"), uploadPDF);
uploadRouter.get("/imagekit/auth", verifyToken, getAuthenticationParameters);

export default uploadRouter;
