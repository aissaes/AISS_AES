import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isHOD } from "../middlewares/roleMiddleware.js"; 
import { 
  transferHOD, 
  assignStudentsToCourse, 
  unassignStudentsFromCourse, 
  getDepartmentStudents, 
  generateToken, 
  generateQRCode,
  updateStudentAcademics
} from "../controllers/faculty/hodController.js";

import {
  createSemester,
  getSemesters,
  updateSemester,
  toggleSemesterStatus
} from "../controllers/academic/semesterController.js";

import {
  createCourse,
  getCourses,
  updateCourse,
  archiveCourse,
  assignFacultyToCourse
} from "../controllers/academic/courseController.js";

const hodRouter = express.Router();

// Apply auth middlewares to ALL HOD routes
hodRouter.use(verifyToken, isHOD);

hodRouter.post("/transfer", transferHOD);

// Student Assignment/Unassignment (Course Registration)
hodRouter.post("/students/assign", assignStudentsToCourse);
hodRouter.post("/students/unassign", unassignStudentsFromCourse);
hodRouter.put("/students/edit", updateStudentAcademics);

// GET Enrolled Students in HOD's Department & Course
hodRouter.get("/students", getDepartmentStudents);

// Semester Management Routes
hodRouter.get("/semesters", getSemesters);
hodRouter.post("/semesters", createSemester);
hodRouter.put("/semesters/:id", updateSemester);
hodRouter.put("/semesters/:id/toggle", toggleSemesterStatus);

// Course Management Routes
hodRouter.get("/courses", getCourses);
hodRouter.post("/courses", createCourse);
hodRouter.put("/courses/:id", updateCourse);
hodRouter.delete("/courses/:id", archiveCourse);
hodRouter.post("/courses/assign-faculty", assignFacultyToCourse);

hodRouter.post("/exams/:examId/generate-token", generateToken);
hodRouter.post("/exams/:examId/generate-qr", generateQRCode);

export default hodRouter;