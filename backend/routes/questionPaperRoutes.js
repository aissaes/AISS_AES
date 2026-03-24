import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isHOD,isHODOrCollegeAdmin } from "../middlewares/roleMiddleware.js";
import { 
  uploadQuestionPaper, 
  getFacultyAssignments, 
  getPendingPapers, 
  getApprovedPapers,
  reviewQuestionPaper,
  getQuestionPaperById,
  updateQuestionPaper
} from "../controllers/questionPaperController.js";

const questionPaperRouter = express.Router();

// --- faculty ROUTES ---
questionPaperRouter.get("/assignments", verifyToken, getFacultyAssignments);
questionPaperRouter.post("/upload", verifyToken, uploadQuestionPaper);
questionPaperRouter.put("/update/:paperId", verifyToken, updateQuestionPaper);

// --- HOD ROUTES ---
questionPaperRouter.get("/pending", verifyToken, isHOD, getPendingPapers);
questionPaperRouter.get("/approved", verifyToken , getApprovedPapers);

questionPaperRouter.put("/review/:paperId", verifyToken, isHOD, reviewQuestionPaper);

// --- SHARED ROUTES (Teachers & HODs) ---
questionPaperRouter.get("/:paperId", verifyToken, getQuestionPaperById);

export default questionPaperRouter;