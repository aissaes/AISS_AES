import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isStudent } from "../middlewares/roleMiddleware.js";
import { 
  getExamResultsOverview, 
  getStudentDetailedResult,
  getMyResult,
  getMyExamsList 
} from "../controllers/evaluation/resultController.js";

const resultRoutes = express.Router();

// --- FACULTY ROUTES ---
// 1. Get list of all students for an exam
resultRoutes.get("/faculty/exam/:examId", verifyToken, getExamResultsOverview);
// 2. Get detailed view (images + AI JSON) for a specific student
resultRoutes.get("/faculty/exam/:examId/student/:studentId", verifyToken, getStudentDetailedResult);

// --- STUDENT ROUTES ---
// 1. DASHBOARD: Get list of all exams this student has taken
resultRoutes.get("/student/my-exams", verifyToken, isStudent, getMyExamsList);
// 2. DEEP DIVE: Get specific marks and AI feedback for one exam
resultRoutes.get("/student/exam/:examId", verifyToken, isStudent, getMyResult);

export default resultRoutes;