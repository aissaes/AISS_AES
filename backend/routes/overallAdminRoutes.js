import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isOverallAdmin } from "../middlewares/roleMiddleware.js";
import { changeOverallAdminPassword, getPendingColleges, approveCollege, transferOverallAdmin } from "../controllers/overallAdminController.js"; // Direct import

const overallAdminRouter = express.Router();

// Only logged-in Overall Admins can access this route
overallAdminRouter.put("/change-password", verifyToken, isOverallAdmin, changeOverallAdminPassword);
overallAdminRouter.get("/pending-colleges", verifyToken, isOverallAdmin, getPendingColleges);
overallAdminRouter.put("/approve-college/:collegeId", verifyToken, isOverallAdmin, approveCollege);
overallAdminRouter.post("/transfer-overalladmin", verifyToken, isOverallAdmin, transferOverallAdmin);

export default overallAdminRouter;