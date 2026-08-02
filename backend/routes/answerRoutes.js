import express from "express";
import { uploadExam } from "../middlewares/uploadMiddleware.js";
import { reuploadAnswer, UploadAnswer, finalizeSubmission } from "../controllers/answerController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isStudent } from "../middlewares/roleMiddleware.js"; // Ensures only students can upload

const answerRoutes = express.Router();

// Protected routes for uploading
answerRoutes.post('/upload', verifyToken, isStudent, uploadExam.single("file"), UploadAnswer);
answerRoutes.post('/reupload', verifyToken, isStudent, uploadExam.single("file"), reuploadAnswer);
answerRoutes.post("/finalize", verifyToken, isStudent, finalizeSubmission);

export default answerRoutes;