import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isCollegeAdmin } from "../middlewares/roleMiddleware.js";

import { 
  getAllCollegeFaculty, 
  makeHOD, 
  transferCollegeAdmin,
  updateCollegeDepartments,
  addSingleStudent,
  bulkUploadStudents,
  getAllCollegeStudents,
  updateSingleStudent,
  deleteSingleStudent,
  bulkDeleteStudents
} from "../controllers/faculty/collegeAdminController.js";

const collegeAdminRouter = express.Router();

// Apply auth & admin role middlewares to all routes here
collegeAdminRouter.use(verifyToken, isCollegeAdmin);

// College Overview
collegeAdminRouter.get("/college", getAllCollegeFaculty);

// update departments in a college
collegeAdminRouter.put("/update-departments", updateCollegeDepartments);

// Role Management
collegeAdminRouter.post("/make-hod", makeHOD);
collegeAdminRouter.post("/transfer", transferCollegeAdmin);

// Student CRUD Management
collegeAdminRouter.post("/students", addSingleStudent);
collegeAdminRouter.post("/students/bulk-upload", bulkUploadStudents);
collegeAdminRouter.get("/students", getAllCollegeStudents);
collegeAdminRouter.put("/students/:studentId", updateSingleStudent);
collegeAdminRouter.delete("/students/bulk-delete", bulkDeleteStudents);
collegeAdminRouter.delete("/students/:studentId", deleteSingleStudent);

export default collegeAdminRouter;