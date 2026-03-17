//libraries imports
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import 'dotenv/config.js';
import cookieParser from "cookie-parser";
dotenv.config();



// File imports
import connectDB from "./configurations/database.js";
import sendEmail from "./configurations/nodemailer.js";

// Routes imports
import facultyAuthRouter from "./routes/facultyAuth.js";
import facultyRouter from "./routes/facultyRoutes.js";
import hodRouter from "./routes/hodRoutes.js";
import superAdminRouter from "./routes/superAdminRoutes.js";

// import timetableRoutes from "./routes/timeTableRoutes.js";
// import questionPaperRoutes from "./routes/questionPaperRoutes.js";

const PORT = 5000;
connectDB();

// sendEmail();

const app = express();


const allowedOrigins = [
    'http://localhost:5173',         // local React dev
];
app.use(cors({
    origin: allowedOrigins,
    credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

app.use("/faculty/auth", facultyAuthRouter);
app.use("/faculty", facultyRouter);
app.use("/faculty/hod",hodRouter);
app.use("/faculty/superadmin",superAdminRouter);

// app.use("/faculty/timetable", timetableRoutes);
// app.use("/faculty/question-paper", questionPaperRoutes);



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});