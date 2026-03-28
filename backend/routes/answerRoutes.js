import express from "express";
import { uploadExam } from "../middlewares/uploadMiddleware.js";
import { generateQRCode, generateToken, reuploadAnswer, UploadAnswer } from "../controllers/answerController.js";



const answerRoutes=express.Router();


answerRoutes.post('/upload',uploadExam.single("file"),UploadAnswer);
answerRoutes.post('/reupload',uploadExam.single("file"),reuploadAnswer);
answerRoutes.post('/generateToken/:id',generateToken);
answerRoutes.post('/generateQR/:id',generateQRCode);


export default answerRoutes;