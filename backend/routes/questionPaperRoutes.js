// import express from "express";
// import { verifyToken } from "../middlewares/authMiddleware.js";
// import { isHOD } from "../middlewares/roleMiddleware.js";
// import { uploadQuestionPaper, viewQuestionPaper, getMyAssignedExams, getMyPreparedPapers } from "../controllers/questionPaper.js";

// const questionRouter = express.Router();

// // Any authenticated faculty can view their exams and upload papers
// questionRouter.get("/my-exams", verifyToken, getMyAssignedExams);

// // Fetch completed exams (paper already uploaded)
// questionRouter.get("/history", verifyToken, getMyPreparedPapers);

// questionRouter.get("/view/:examId", verifyToken, isHOD, viewQuestionPaper);

// questionRouter.post("/upload", verifyToken, uploadQuestionPaper);

// export default questionRouter;  