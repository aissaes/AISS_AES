// import express from "express";
// import { verifyToken } from "../middlewares/authMiddleware.js";
// import { isHOD } from "../middlewares/roleMiddleware.js";
// import { createTimetable, getTimetables, updateExam, deleteExam } from "../controllers/timetable.js";

// const timeTableRouter = express.Router();

// // Only HODs can create the timetable
// timeTableRouter.post("/create", verifyToken, isHOD, createTimetable);

// timeTableRouter.get("/", verifyToken, getTimetables); // Anyone logged in can view
// timeTableRouter.put("/exam/:examId", verifyToken, isHOD, updateExam); // Only HOD can edit
// timeTableRouter.delete("/exam/:examId", verifyToken, isHOD, deleteExam); // Only HOD can delete

// export default timeTableRouter;