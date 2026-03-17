import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isSuperAdmin } from "../middlewares/roleMiddleware.js";

import { 
  getAllCollegeFaculty, 
  makeHOD, 
  transferSuperAdmin 
} from "../controllers/faculty/superAdminController.js";

const superAdminRouter = express.Router();

// College Overview
superAdminRouter.get("/college", verifyToken, isSuperAdmin, getAllCollegeFaculty);

// Role Management
superAdminRouter.post("/make-hod", verifyToken, isSuperAdmin, makeHOD);
superAdminRouter.post("/transfer", verifyToken, isSuperAdmin, transferSuperAdmin);

export default superAdminRouter;