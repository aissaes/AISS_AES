import Student from "../models/student.js";
import Exam from "../models/exam.js";
import Upload from "../models/uploadSession.js";
import Answers from "../models/answer.js";
import Timetable from "../models/timetable.js";
import StudentCourseEnrollment from "../models/studentCourseEnrollment.js";
import Result from "../models/result.js";

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
    const exam = await Exam.findOne({ token })
      .populate("questionPaper")
      .populate("assignedFaculty", "name email")
      .populate("courseId")
      .populate("semesterId", "semesterNumber semesterName")
      .populate("department", "name code");

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

    if (Date.now() > new Date(exam.endTime).getTime()) {
      return res.status(403).json({
        success: false,
        message: "Exam submission time window has already closed. Late submissions are not permitted."
      });
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

export const getStudentSubmissions = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;

    const submission = await Answers.findOne({ for_exam: examId, uploaded_student: studentId });

    return res.status(200).json({
      success: true,
      answers: submission ? submission.answers : {},
    });
  } catch (err) {
    console.error("Error fetching student submissions:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const getStudentTimetableAndExams = async (req, res) => {
  try {
    const studentId = req.user.id;

    // 1. Fetch student profile to get filter properties
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    const { collegeId, semester } = student;
    const enrollments = await StudentCourseEnrollment.find({ student: studentId }).select('course');
    const crs = enrollments.map(e => e.course);

    // Return empty results immediately if student is not yet assigned to any course
    if (!semester || crs.length === 0) {
      return res.status(200).json({
        success: true,
        timetables: [],
        exams: []
      });
    }

    // 2. Fetch timetables matching college and semester
    const timetables = await Timetable.find({
      collegeId,
      semester
    })
    .populate("semester", "semesterNumber semesterName academicYear status")
    .populate("department", "name code")
    .populate({
      path: 'exams',
      select: '-questionPaper -token -qrCode', // Hide sensitive fields from students!
      populate: [
        { path: 'assignedFaculty', select: 'name email' },
        { path: 'courseId' },
        { path: 'semesterId', select: 'semesterNumber semesterName' }
      ]
    })
    .sort({ createdAt: -1 });

    // 3. Fetch exams matching college and enrolled courses
    const exams = await Exam.find({
      collegeId,
      courseId: { $in: crs }
    })
    .select('-questionPaper -token -qrCode') // Hide sensitive fields from students!
    .populate('assignedFaculty', 'name email')
    .populate('courseId')
    .populate('semesterId', 'semesterNumber semesterName')
    .populate('department', 'name code')
    .sort({ date: 1 });

    const examIds = exams.map(e => e._id);
    const submissions = await Answers.find({
      for_exam: { $in: examIds },
      uploaded_student: studentId
    });
    const results = await Result.find({
      student: studentId,
      exam: { $in: examIds }
    });

    const submittedExamIds = new Set(submissions.map(s => s.for_exam.toString()));
    const resultExamIds = new Set(results.map(r => r.exam.toString()));

    const examsWithSubmission = exams.map(exam => {
      const examObj = exam.toObject();
      examObj.hasSubmitted = submittedExamIds.has(exam._id.toString()) || resultExamIds.has(exam._id.toString());
      return examObj;
    });

    res.status(200).json({
      success: true,
      timetables,
      exams: examsWithSubmission
    });

  } catch (error) {
    console.error("Error fetching student timetable and exams:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};