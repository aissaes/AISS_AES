import "dotenv/config"; 

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

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


// You no longer need dotenv.config() down here.
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
app.use("/student", studentRouter);

//answer Routes
app.use('/answer',answerRoutes);


// Local dev server — Vercel uses the export below instead
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});

export default app;