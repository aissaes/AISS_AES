import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isHOD, isHODOrSuperAdmin } from "../middlewares/roleMiddleware.js"; 

import { 
  transferHOD 
} from "../controllers/faculty/hodController.js";

const hodRouter = express.Router();

// ONLY the current HOD can transfer their power away
hodRouter.post("/transfer", verifyToken, isHOD, transferHOD);

export default hodRouter;