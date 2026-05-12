import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { isHOD } from "../middlewares/roleMiddleware.js"; 
import { 
  transferHOD, addSingleStudent, bulkUploadStudents, getDepartmentStudents, 
  updateSingleStudent, bulkUpdateStudents, 
  deleteSingleStudent, bulkDeleteStudents,generateToken, generateQRCode
} from "../controllers/faculty/hodController.js";

const hodRouter = express.Router();

// Apply auth middlewares to ALL HOD routes
hodRouter.use(verifyToken, isHOD);

hodRouter.post("/transfer", transferHOD);


// POST
hodRouter.post("/students", addSingleStudent);
hodRouter.post("/students/bulk-upload", bulkUploadStudents);

// GET
hodRouter.get("/students", getDepartmentStudents);

// PUT - BULK MUST GO BEFORE :studentId
hodRouter.put("/students/bulk-update", bulkUpdateStudents);
hodRouter.put("/students/:studentId", updateSingleStudent);

// DELETE - BULK MUST GO BEFORE :studentId
hodRouter.delete("/students/bulk-delete", bulkDeleteStudents);
hodRouter.delete("/students/:studentId", deleteSingleStudent);


hodRouter.post("/exams/:examId/generate-token", generateToken);
hodRouter.post("/exams/:examId/generate-qr", generateQRCode);

export default hodRouter;