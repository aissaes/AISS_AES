import express from "express";
import { getAllCollegesList, getCollegeDepartments } from "../controllers/collegeController.js";

const collegeRouter = express.Router();

// These do NOT have verifyToken because a new user needs to see them BEFORE logging in!
collegeRouter.get("/list", getAllCollegesList);
collegeRouter.get("/:collegeId/departments", getCollegeDepartments);

export default collegeRouter;