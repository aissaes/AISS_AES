import Student from "../models/student.js";
import Exam from "../models/exam.js";
import Timetable from "../models/timetable.js";
import ExamSubmission from "../models/examSubmission.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { uploadToImageKit } from "../utils/imageKit.js";

// --- AUTHENTICATION ---

export const registerStudent = async (req, res) => {
  try {
    const { name, email, password, rollNumber, collegeId, department, course, semester, cgpa } = req.body;

    if (!collegeId) {
      return res.status(400).json({ message: "College selection is required." });
    }

    // Check if student exists
    const existingStudent = await Student.findOne({ $or: [{ email }, { rollNumber }] });
    if (existingStudent) {
      return res.status(400).json({ message: "Student with this email or roll number already exists." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create student
    const newStudent = new Student({
      name,
      email,
      password: hashedPassword,
      rollNumber,
      collegeId,
      department,
      course,
      semester,
      cgpa: cgpa || 0,
      role: "Student",
    });

    await newStudent.save();

    res.status(201).json({ message: "Student registered successfully." });
  } catch (error) {
    console.error("Error in registerStudent:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { id: student._id, role: student.role, collegeId: student.collegeId, department: student.department, course: student.course, semester: student.semester },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      message: "Login successful.",
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        collegeId: student.collegeId,
        department: student.department,
        course: student.course,
        semester: student.semester
      },
      token
    });
  } catch (error) {
    console.error("Error in loginStudent:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const logoutStudent = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).json({ message: "Logged out successfully." });
};

// --- STUDENT DATA ---

export const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("-password -__v");
    if (!student) return res.status(404).json({ message: "Student not found." });
    
    res.status(200).json(student);
  } catch (error) {
    console.error("Error in getStudentProfile:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getStudentTimetable = async (req, res) => {
  try {
    const { collegeId, department, course, semester } = req.user;
    
    const timetables = await Timetable.find({ collegeId, department, course, semester })
      .populate("exams")
      .populate("createdBy", "name email");
      
    res.status(200).json(timetables);
  } catch (error) {
    console.error("Error in getStudentTimetable:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// --- EXAM SYSTEM ---

export const getStudentExams = async (req, res) => {
  try {
    const { collegeId, department, course, semester } = req.user;
    
    const exams = await Exam.find({ collegeId, department, course, semester }).sort({ date: 1 });
    res.status(200).json(exams);
  } catch (error) {
    console.error("Error in getStudentExams:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found." });
    
    res.status(200).json(exam);
  } catch (error) {
    console.error("Error in getExamById:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const checkExamUploadWindow = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found." });

    const now = Date.now();
    const endTime = new Date(exam.endTime).getTime();
    
    // Window rule: exactly 15 minutes after the exam ends.
    const windowDuration = 15 * 60 * 1000;
    const windowEnd = endTime + windowDuration;

    if (now < endTime) {
      return res.status(200).json({ 
        status: "not_started", 
        message: "Upload not started yet. Wait until exam end time.",
        timeRemainingMs: endTime - now 
      });
    }

    if (now >= endTime && now <= windowEnd) {
      return res.status(200).json({ 
        status: "active", 
        message: "Upload window is active.",
        timeRemainingMs: windowEnd - now
      });
    }

    return res.status(200).json({ 
      status: "expired", 
      message: "Upload window expired.",
      timeRemainingMs: 0
    });
  } catch (error) {
    console.error("Error in checkExamUploadWindow:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const uploadExamSubmission = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found." });

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Please provide an answer sheet." });
    }

    // Verification again on submit
    const now = Date.now();
    const endTime = new Date(exam.endTime).getTime();
    const windowDuration = 15 * 60 * 1000;
    const windowEnd = endTime + windowDuration;

    if (now < endTime) {
      return res.status(403).json({ message: "Upload not started yet." });
    }
    if (now > windowEnd) {
      return res.status(403).json({ message: "Upload window expired. Submission rejected." });
    }

    // Check Duplicate
    const existing = await ExamSubmission.findOne({ student: req.user.id, exam: exam._id });
    if (existing && existing.status === "uploaded") {
      return res.status(400).json({ message: "You have already submitted your exam." });
    }

    // Buffer to upload to ImageKit
    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname;
    
    // Create uniquely nested folder wise: /AISAESS_Exams/DeptName/Course/Semester/ExamID/
    const folderPath = `/AISAESS_Exams/${exam.department.replace(/\s+/g, '_')}/${exam.course}/${exam.semester}/${exam._id}`;

    // Upload to ImageKit
    const result = await uploadToImageKit(fileBuffer, originalName, folderPath);

    // Create DB entry mapping the secure upload
    const submission = new ExamSubmission({
      student: req.user.id,
      exam: exam._id,
      fileUrl: result.url,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      status: "uploaded",
      clientIp: req.ip || req.connection.remoteAddress
    });
    
    // Note: If reusing an existing failed doc, we'd update it instead.
    // Given the unique index, we need to handle if 'failed' entry already existed:
    if (existing) {
      existing.fileUrl = result.url;
      existing.fileType = req.file.mimetype;
      existing.fileSize = req.file.size;
      existing.status = "uploaded";
      existing.clientIp = req.ip || req.connection.remoteAddress;
      await existing.save();
    } else {
      await submission.save();
    }

    res.status(201).json({ message: "File uploaded successfully.", url: result.url });
  } catch (error) {
    console.error("Error in uploadExamSubmission:", error);
    res.status(500).json({ message: "Server Error or ImageKit Upload failed", error: error.message });
  }
};

export const getSubmissionStatus = async (req, res) => {
  try {
    const submission = await ExamSubmission.findOne({ 
      student: req.user.id, 
      exam: req.params.examId 
    });

    if (!submission) {
      return res.status(200).json({ status: "pending", message: "No submission yet." });
    }

    res.status(200).json({ 
      status: submission.status, 
      fileUrl: submission.fileUrl, 
      submittedAt: submission.createdAt 
    });
  } catch (error) {
    console.error("Error in getSubmissionStatus:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
