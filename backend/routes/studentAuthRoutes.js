import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isStudent } from "../middlewares/roleMiddleware.js";
import { loginStudent, logoutStudent, viewProfile, resetPassword } from "../controllers/authentication/studentAuth.js";

const studentAuthRouter = express.Router();

studentAuthRouter.post("/login", loginStudent);
studentAuthRouter.post("/logout", verifyToken, isStudent, logoutStudent);
studentAuthRouter.get("/profile", verifyToken, isStudent, viewProfile);
studentAuthRouter.put("/change-password", verifyToken, isStudent, resetPassword);

export default studentAuthRouter;