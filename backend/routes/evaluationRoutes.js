import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { 
  getAllStudentsAppearedForExam,
  triggerAIEvaluation,
  uploadTeacherMaterials,
  overrideAIGrade,
  publishExamResults
} from "../controllers/evaluation/evaluationController.js";

const evaluationRouter = express.Router();

// 1. Get all students who appeared for an exam
evaluationRouter.get("/:examId/students", verifyToken, getAllStudentsAppearedForExam);

// 2. Upload teacher materials (notes or answer_key)
evaluationRouter.post("/:examId/upload-materials", verifyToken, uploadTeacherMaterials);

// 3. Trigger AI evaluation for the exam
evaluationRouter.post("/:examId/evaluate", verifyToken, triggerAIEvaluation);

// 4. OVERRIDE: Manually change a student's score for a specific question
evaluationRouter.put("/:examId/student/:studentId/override", verifyToken, overrideAIGrade);

// 5. PUBLISH RESULTS: Faculty-controlled results publishing
evaluationRouter.put("/:examId/publish-results", verifyToken, publishExamResults);

export default evaluationRouter;