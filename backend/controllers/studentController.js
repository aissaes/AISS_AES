import Student from "../models/student.js";
import Exam from "../models/exam.js";
import Upload from "../models/uploadSession.js";

export const getExamByIdByToken = async (req, res) => {
  try {
    const { token } = req.body;

    // 1. Validate input
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // 2. Find exam using token
    const exam = await Exam.findOne({ token });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // 3. Optional: check if exam is active (recommended)
    if (exam.startTime && Date.now() < new Date(exam.startTime)) {
      return res.status(403).json({
        success: false,
        message: "Exam has not started yet",
      });
    }

    if (exam.endTime && Date.now() > new Date(exam.endTime)) {
      return res.status(403).json({
        success: false,
        message: "Exam has ended",
      });
    }

    // 4. Return exam details
    return res.status(200).json({
      success: true,
      message:exam
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const startUploadSession = async (req, res) => {
  try {
    const { token } = req.body;
    const studentId = req.user.id; // From verifyToken middleware

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required." });
    }

    // 1. Verify the exam token exists
    const exam = await Exam.findOne({ token });
    if (!exam) {
      return res.status(404).json({ success: false, message: "Invalid or expired exam token." });
    }

    // 2. Check if the student already has an active session for this exam
    let session = await Upload.findOne({ student: studentId, exam: exam._id });

    if (session) {
      // If session exists, check if it's expired
      if (Date.now() > session.expiresAt.getTime()) {
        return res.status(403).json({ 
          success: false, 
          message: "Your 15-minute upload window has already expired." 
        });
      }
      // If it exists and is NOT expired, just return the existing session
      return res.status(200).json({ 
        success: true, 
        message: "Resuming your active session.", 
        expiresAt: session.expiresAt 
      });
    }

    // 3. Create a brand new 15-minute session
    const windowMinutes = 15;
    const expiresAt = new Date(Date.now() + windowMinutes * 60 * 1000);

    session = await Upload.create({
      student: studentId,
      exam: exam._id,
      token: token,
      expiresAt: expiresAt
    });

    res.status(201).json({
      success: true,
      message: `Upload window started! You have ${windowMinutes} minutes.`,
      expiresAt: session.expiresAt
    });

  } catch (error) {
    console.error("Error starting upload session:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};