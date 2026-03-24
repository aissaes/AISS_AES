import express from "express";
import { 
  seedOverallAdmin, 
  loginOverallAdmin, 
  verifyOverallAdminOTP,
  logoutOverallAdmin
} from "../controllers/authentication/overallAdminAuth.js";

const overallAdminAuthRouter = express.Router();

overallAdminAuthRouter.post("/seed", seedOverallAdmin);
overallAdminAuthRouter.post("/login", loginOverallAdmin);
overallAdminAuthRouter.post("/verify-otp", verifyOverallAdminOTP);
overallAdminAuthRouter.post("/logout", logoutOverallAdmin);

export default overallAdminAuthRouter;