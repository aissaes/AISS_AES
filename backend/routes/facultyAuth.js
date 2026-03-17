import express from "express";
import {registerFaculty,loginFaculty,verifyOTP, seedSuperAdmin} from "../controllers/authentication/facultyAuth.js"


const facultyAuthRouter = express.Router();

facultyAuthRouter.post("/register", registerFaculty);
facultyAuthRouter.post("/login", loginFaculty);
facultyAuthRouter.post("/verify-otp", verifyOTP);

// Hidden developer route to create the first Super Admin
facultyAuthRouter.post("/seed-admin", seedSuperAdmin);

export default facultyAuthRouter;