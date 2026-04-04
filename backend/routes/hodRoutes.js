import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isHOD } from "../middlewares/roleMiddleware.js"; 
import { 
  transferHOD, addSingleStudent, bulkUploadStudents, getDepartmentStudents, 
  updateSingleStudent, bulkUpdateStudents, 
  deleteSingleStudent, bulkDeleteStudents
} from "../controllers/faculty/hodController.js";

import { 
  extractTextFromPDF, 
  uploadTextToVectorDB,
  generateToken,
  generateQRCode 
} from "../controllers/examController.js";

import { 
  evaluateStudentExam, 
  evaluateAllStudentsForExam 
} from "../controllers/evaluationController.js";

import { uploadExam } from "../middlewares/uploadMiddleware.js";

const hodRouter = express.Router();

// Apply auth middlewares to ALL HOD routes
hodRouter.use(verifyToken, isHOD);

hodRouter.post("/transfer", transferHOD);

// POST
hodRouter.post("/students", addSingleStudent);
hodRouter.post("/students/bulk-upload", bulkUploadStudents);

// GET
hodRouter.get("/students", getDepartmentStudents);

// PUT - BULK MUST GO BEFORE :studentId
hodRouter.put("/students/bulk-update", bulkUpdateStudents);
hodRouter.put("/students/:studentId", updateSingleStudent);

// DELETE - BULK MUST GO BEFORE :studentId
hodRouter.delete("/students/bulk-delete", bulkDeleteStudents);
hodRouter.delete("/students/:studentId", deleteSingleStudent);

// ==========================================
// EXAM MANAGEMENT & EVALUATION (Mapped securely under /faculty/hod/)
// ==========================================

// Pre-exam Security 
hodRouter.post("/exams/:examId/generate-token", generateToken);
hodRouter.post("/exams/:examId/generate-qr", generateQRCode);

// Master Answer Key Setup
hodRouter.post("/exams/extract-pdf", uploadExam.single("pdf"), extractTextFromPDF);
hodRouter.post("/exams/:examId/upload-text", uploadTextToVectorDB);

// AI Automatic Evaluations
hodRouter.post("/exams/:examId/evaluate/:studentId", evaluateStudentExam);
hodRouter.post("/exams/:examId/evaluate-all", evaluateAllStudentsForExam);

export default hodRouter;