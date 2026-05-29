import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isHOD } from "../middlewares/roleMiddleware.js"; 
import { 
  transferHOD, 
  assignStudentsToCourse, 
  unassignStudentsFromCourse, 
  getDepartmentStudents, 
  generateToken, 
  generateQRCode
} from "../controllers/faculty/hodController.js";

const hodRouter = express.Router();

// Apply auth middlewares to ALL HOD routes
hodRouter.use(verifyToken, isHOD);

hodRouter.post("/transfer", transferHOD);

// Student Assignment/Unassignment (Course Registration)
hodRouter.post("/students/assign", assignStudentsToCourse);
hodRouter.post("/students/unassign", unassignStudentsFromCourse);

// GET Enrolled Students in HOD's Department & Course
hodRouter.get("/students", getDepartmentStudents);

hodRouter.post("/exams/:examId/generate-token", generateToken);
hodRouter.post("/exams/:examId/generate-qr", generateQRCode);

export default hodRouter;