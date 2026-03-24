import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isHOD } from "../middlewares/roleMiddleware.js";
import { 
  createTimetable, 
  getTimetables, 
  addExamToTimetable,
  updateExam, 
  deleteExam,
  getTimetableById,
  getExamById,      
} from "../controllers/timetableController.js";

const timeTableRouter = express.Router();

// Anyone logged in (Faculty, HOD, College Admin) can view the timetables for their department
timeTableRouter.get("/", verifyToken, getTimetables); 

timeTableRouter.get("/:timetableId", verifyToken, getTimetableById);
timeTableRouter.get("/exam/:examId", verifyToken, getExamById);

// ONLY HODs can create, edit, or delete the timetables
timeTableRouter.post("/create", verifyToken, isHOD, createTimetable);

//Hod adding a new exam inside a timetable
timeTableRouter.post("/:timetableId/add-exam", verifyToken, isHOD, addExamToTimetable);

timeTableRouter.put("/exam/:examId", verifyToken, isHOD, updateExam); 
timeTableRouter.delete("/exam/:examId", verifyToken, isHOD, deleteExam); 

export default timeTableRouter;