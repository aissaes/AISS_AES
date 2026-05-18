import "dotenv/config"; 

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer"; // <-- Added for image upload
import ImageKit from "imagekit"; // <-- Added for image upload

import connectDB from "./configurations/database.js";

// --- ROUTES ---
import facultyAuthRouter from "./routes/facultyAuth.js";
import overallAdminAuthRouter from "./routes/overallAdminAuth.js";
import overallAdminRouter from "./routes/overallAdminRoutes.js";
import facultyRouter from "./routes/facultyRoutes.js";
import hodRouter from "./routes/hodRoutes.js";

import collegeAdminRouter from "./routes/collegeAdminRoutes.js";
import timetableRoutes from "./routes/timeTableRoutes.js";
import questionPaperRoutes from "./routes/questionPaperRoutes.js";
import collegeRouter from "./routes/collegeRoutes.js";
import studentRouter from "./routes/studentRoutes.js";
import answerRoutes from "./routes/answerRoutes.js";
import studentAuthRouter from "./routes/studentAuthRoutes.js";

const app = express();

// updated CORS array for local & Vercel
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://aiss-aes-8ju1.vercel.app",
  "https://aiss-aes-frontend.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// --- IMAGEKIT & MULTER CONFIGURATION ---
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});
// ---------------------------------------

//  Vercel Fix: Connect DB inside request lifecycle
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// --- ROUTE MAPPINGS ---

// Public / Base Routes
app.use("/college", collegeRouter);

// Auth Routes
app.use("/faculty/auth", facultyAuthRouter);
app.use("/overallAdmin/auth", overallAdminAuthRouter);

// Faculty & hod Routes
app.use("/faculty", facultyRouter);
app.use("/faculty/hod", hodRouter);

// Administration Routes
app.use("/faculty/collegeadmin", collegeAdminRouter);
app.use("/overallAdmin", overallAdminRouter);

// Academic Feature Routes
app.use("/faculty/timetable", timetableRoutes);
app.use("/faculty/question-paper", questionPaperRoutes);

// Student Routes
app.use("/student/auth", studentAuthRouter);
app.use("/student", studentRouter);

//answer Routes
app.use('/answer',answerRoutes);

// --- IMAGE UPLOAD ROUTE ---
app.post('/upload-image', upload.single('answer_script'), async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ error: 'No image file uploaded.' });
      }

      const uploadResponse = await imagekit.upload({
          file: req.file.buffer, 
          fileName: req.file.originalname, 
          folder: "/answer_scripts", 
          useUniqueFileName: true 
      });

      return res.status(200).json({
          success: true,
          message: 'Image uploaded successfully',
          imageUrl: uploadResponse.url,
          fileId: uploadResponse.fileId
      });

  } catch (error) {
      console.error('ImageKit Upload Error:', error);
      return res.status(500).json({ 
          success: false, 
          error: 'Failed to upload image to ImageKit' 
      });
  }
});
// --------------------------

// --- PDF UPLOAD ROUTE ---
app.post('/upload-pdf', upload.single('pdf_file'), async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded.' });
      }

      // Security Check: Ensure the uploaded file is actually a PDF
      if (req.file.mimetype !== 'application/pdf') {
          return res.status(400).json({ error: 'Invalid file format. Please upload a PDF.' });
      }

      const uploadResponse = await imagekit.upload({
          file: req.file.buffer, 
          fileName: req.file.originalname, 
          folder: "/teacher_materials", // Changed the folder to keep things organized
          useUniqueFileName: true 
      });

      return res.status(200).json({
          success: true,
          message: 'PDF uploaded successfully',
          pdfUrl: uploadResponse.url, // Changed variable name to pdfUrl for clarity
          fileId: uploadResponse.fileId
      });

  } catch (error) {
      console.error('ImageKit PDF Upload Error:', error);
      return res.status(500).json({ 
          success: false, 
          error: 'Failed to upload PDF to ImageKit' 
      });
  }
});

// Local dev server — Vercel uses the export below instead
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});

export default app;