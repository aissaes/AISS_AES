import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { 
  getAllStudentsAppearedForExam,
  triggerAIEvaluation,
  uploadTeacherMaterials,
  getTeacherMaterials,
  getMaterialHistory,
  deleteTeacherMaterial,
  overrideAIGrade,
  publishExamResults,
  evaluationWebhookCallback
} from "../controllers/evaluation/evaluationController.js";

const evaluationRouter = express.Router();

// 1. Get all students who appeared for an exam
evaluationRouter.get("/:examId/students", verifyToken, getAllStudentsAppearedForExam);

// 2. Materials management routes (Upload, Retrieve, Delete, History)
evaluationRouter.post("/:examId/upload-materials", verifyToken, uploadTeacherMaterials);
evaluationRouter.get("/:examId/materials", verifyToken, getTeacherMaterials);
evaluationRouter.get("/:examId/materials/:materialId/history", verifyToken, getMaterialHistory);
evaluationRouter.delete("/:examId/materials/:materialId", verifyToken, deleteTeacherMaterial);

// 3. Trigger AI evaluation for the exam
evaluationRouter.post("/:examId/evaluate", verifyToken, triggerAIEvaluation);

// 4. OVERRIDE: Manually change a student's score for a specific question
evaluationRouter.put("/:examId/student/:studentId/override", verifyToken, overrideAIGrade);

// 5. PUBLISH RESULTS: Faculty-controlled results publishing
evaluationRouter.put("/:examId/publish-results", verifyToken, publishExamResults);

// 6. Webhook callback for async evaluation
evaluationRouter.post("/webhook-callback", evaluationWebhookCallback);

export default evaluationRouter;