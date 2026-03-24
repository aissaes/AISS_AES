import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isCollegeAdmin } from "../middlewares/roleMiddleware.js";

import { 
  getAllCollegeFaculty, 
  makeHOD, 
  transferCollegeAdmin,
  updateCollegeDepartments
} from "../controllers/faculty/collegeAdminController.js";

const collegeAdminRouter = express.Router();

// College Overview
collegeAdminRouter.get("/college", verifyToken, isCollegeAdmin, getAllCollegeFaculty);

// update departments in a college
collegeAdminRouter.put("/update-departments", verifyToken, isCollegeAdmin, updateCollegeDepartments);

// Role Management
collegeAdminRouter.post("/make-hod", verifyToken, isCollegeAdmin, makeHOD);
collegeAdminRouter.post("/transfer", verifyToken, isCollegeAdmin, transferCollegeAdmin);

export default collegeAdminRouter;