import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isOverallAdmin } from "../middlewares/roleMiddleware.js";
import { addCollegeAndAdmin, changeOverallAdminPassword } from "../controllers/overallAdminController.js"; // Direct import

const overallAdminRouter = express.Router();

// Only logged-in Overall Admins can access this route
overallAdminRouter.post("/add-collegeandAdmin", verifyToken, isOverallAdmin, addCollegeAndAdmin);
overallAdminRouter.put("/change-password", verifyToken, isOverallAdmin, changeOverallAdminPassword);

export default overallAdminRouter;