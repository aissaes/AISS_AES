import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isHODOrCollegeAdmin } from "../middlewares/roleMiddleware.js"; // <-- Import the dual-role middleware

import { 
  getMyProfile, 
  updateProfile, 
  changePassword,
  getFacultyApprovedList,
  approveFaculty,
  rejectFaculty,
  getDepartmentFaculty
} from "../controllers/faculty/facultyController.js";

const facultyRouter = express.Router();

// ACCESSIBLE BY ALL (Faculty, HOD, SuperAdmin)

facultyRouter.get("/me", verifyToken, getMyProfile);
facultyRouter.put("/profile", verifyToken, updateProfile);
facultyRouter.put("/change-password", verifyToken, changePassword);

// ACCESSIBLE ONLY BY HOD & SUPER ADMIN

facultyRouter.get("/approvals", verifyToken, isHODOrCollegeAdmin, getFacultyApprovedList);

// Moved these here so the Super Admin can approve the very first batch of faculty!
facultyRouter.post("/approve", verifyToken, isHODOrCollegeAdmin, approveFaculty);
facultyRouter.post("/reject", verifyToken, isHODOrCollegeAdmin, rejectFaculty);

// Both HOD and Super Admin might need to view a specific department's faculty list
facultyRouter.get("/", verifyToken, isHODOrCollegeAdmin, getDepartmentFaculty);
export default facultyRouter;