import express from "express";
import { getAllCollegesList, getCollegeDepartments,collegeRegisterRequest } from "../controllers/collegeController.js";

const collegeRouter = express.Router();

// These do NOT have verifyToken because a new user needs to see them BEFORE logging in!
collegeRouter.get("/list", getAllCollegesList);
collegeRouter.get("/:collegeId/departments", getCollegeDepartments);
collegeRouter.post("/request", collegeRegisterRequest);

export default collegeRouter;