import express from "express";
// import { 
//   registerStudent, 
//   loginStudent, 
//   logoutStudent, 
//   getStudentProfile, 
//   getStudentTimetable, 
//   getStudentExams, 
//   getExamById, 
//   checkExamUploadWindow, 
//   uploadExamSubmission, 
//   getSubmissionStatus 
// } from "../controllers/studentController.js";
// import { verifyToken } from "../middlewares/authMiddleware.js";
// import { uploadExam } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// // Role middleware explicitly for students
// const authorizeStudent = (req, res, next) => {
//   if (req.user && req.user.role === 'Student') {
//     next();
//   } else {
//     return res.status(403).json({ message: "Access denied. Student resources only." });
//   }
// };

// // Apply auth and role middleware to protected routes
// const protect = [verifyToken, authorizeStudent];

// // Auth
// router.post("/auth/register", registerStudent);
// router.post("/auth/login", loginStudent);
// router.post("/auth/logout", protect, logoutStudent);

// // Student Data
// router.get("/profile", protect, getStudentProfile);
// router.get("/timetable", protect, getStudentTimetable);

// // Exams
// router.get("/exams", protect, getStudentExams);
// router.get("/exams/:id", protect, getExamById);

// // Submissions (15-Minute Window Feature)
// router.get("/exams/:examId/window", protect, checkExamUploadWindow);
// router.post("/exam-submissions/:examId", protect, uploadExam.single("answerSheet"), uploadExamSubmission);
// router.get("/exam-submissions/:examId/status", protect, getSubmissionStatus);

export default router;
