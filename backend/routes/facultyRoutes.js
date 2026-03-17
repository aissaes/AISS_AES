import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isHODOrSuperAdmin } from "../middlewares/roleMiddleware.js"; // <-- Import the dual-role middleware

import { 
  getMyProfile, 
  updateProfile, 
  getFacultyApprovedList,
  approveFaculty,
  rejectFaculty,
  getDepartmentFaculty
} from "../controllers/faculty/facultyController.js";

const facultyRouter = express.Router();

// ACCESSIBLE BY ALL (Faculty, HOD, SuperAdmin)

facultyRouter.get("/me", verifyToken, getMyProfile);
facultyRouter.put("/profile", verifyToken, updateProfile);

// ACCESSIBLE ONLY BY HOD & SUPER ADMIN

facultyRouter.get("/approvals", verifyToken, isHODOrSuperAdmin, getFacultyApprovedList);

// Moved these here so the Super Admin can approve the very first batch of faculty!
facultyRouter.post("/approve", verifyToken, isHODOrSuperAdmin, approveFaculty);
facultyRouter.post("/reject", verifyToken, isHODOrSuperAdmin, rejectFaculty);

// Both HOD and Super Admin might need to view a specific department's faculty list
facultyRouter.get("/", verifyToken, isHODOrSuperAdmin, getDepartmentFaculty);
export default facultyRouter;