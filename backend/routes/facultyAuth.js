import express from "express";
import {registerFaculty, loginFaculty, verifyOTP, logoutFaculty, refreshFacultyToken} from "../controllers/authentication/facultyAuth.js"
import { authLimiter } from "../middlewares/rateLimiter.js";


const facultyAuthRouter = express.Router();

facultyAuthRouter.post("/register", authLimiter, registerFaculty);
facultyAuthRouter.post("/login", authLimiter, loginFaculty);
facultyAuthRouter.post("/verify-otp", authLimiter, verifyOTP);
facultyAuthRouter.post("/refresh-token", refreshFacultyToken);
facultyAuthRouter.post("/logout", logoutFaculty);

export default facultyAuthRouter;