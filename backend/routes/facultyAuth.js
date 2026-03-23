import express from "express";
import {registerFaculty, loginFaculty, verifyOTP, logoutFaculty} from "../controllers/authentication/facultyAuth.js"


const facultyAuthRouter = express.Router();

facultyAuthRouter.post("/register", registerFaculty);
facultyAuthRouter.post("/login", loginFaculty);
facultyAuthRouter.post("/verify-otp", verifyOTP);
facultyAuthRouter.post("/logout", logoutFaculty);

export default facultyAuthRouter;