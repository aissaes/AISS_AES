

import Upload from "../models/uploadSession.js";
import Answers from "../models/answer.js";
import Student from "../models/student.js";
import Exam from "../models/exam.js";

//upload answer sheet
import imagekit from "../configurations/imageKit.js";

const getFolderStructure = async (studentId, examId) => {
  let collegeFolder = "unknown_college";
  let examFolder = examId;
  let studentFolder = studentId;

  try {
    const student = await Student.findById(studentId).populate("collegeId");
    if (student) {
      if (student.collegeId) {
        collegeFolder = student.collegeId.collegeCode
          ? student.collegeId.collegeCode.toUpperCase().replace(/[^a-zA-Z0-9-_]/g, "_")
          : student.collegeId.collegeName.replace(/[^a-zA-Z0-9-_]/g, "_");
      }
      if (student.rollNumber) {
        studentFolder = student.rollNumber.replace(/[^a-zA-Z0-9-_]/g, "_");
      }
    }
  } catch (err) {
    console.error("Error fetching student/college info for folder naming:", err);
  }

  try {
    const exam = await Exam.findById(examId);
    if (exam) {
      const examTypeShortMap = {
        "Mid Semester Examination": "MIDSEM",
        "End Semester Examination": "ENDSEM",
        "Special Mid Semester Examination": "SPL-MIDSEM",
        "Special End Semester Examination": "SPL-ENDSEM"
      };
      const shortType = examTypeShortMap[exam.examType] || "EXAM";
      const year = exam.date ? new Date(exam.date).getFullYear() : new Date().getFullYear();
      examFolder = `${exam.subjectCode}-${shortType}-${year}`.toUpperCase().replace(/[^a-zA-Z0-9-_]/g, "_");
    }
  } catch (err) {
    console.error("Error fetching exam info for folder naming:", err);
  }

  return `/AISSAES/${collegeFolder}/${examFolder}/${studentFolder}`;
};

export const UploadAnswer = async (req, res) => {
  try {
    const { token, questionNo } = req.body;

    // multer file
    const file = req.file;

    if (!file || !token || !questionNo) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 1. Find session
    const session = await Upload.findOne({ token, student: req.user.id });

    if (!session) {
      return res.status(404).json({ error: "Invalid session" });
    }

    // 2. Check expiry
    if (Date.now() > session.expiresAt.getTime()) {
      return res.status(403).json({ error: "Time over" });
    }

    // 3. Upload to ImageKit
    const mimeType = file.mimetype || "application/octet-stream";
    const ext = mimeType === "application/pdf" ? "pdf" : (file.originalname ? file.originalname.split('.').pop() : "jpg");
    const fileNameWithExt = `${session.student}_${session.exam}_q${questionNo}.${ext}`;

    const folderPath = await getFolderStructure(session.student, session.exam);

    const uploadResponse = await imagekit.upload({
      file: file.buffer, // important (memoryStorage)
      fileName: fileNameWithExt,
      folder: folderPath,
    });

    const fileUrl = uploadResponse.url;
    const fileType = mimeType === "application/pdf" ? "pdf" : (mimeType.startsWith("image/") ? "image" : "unknown");
    const originalFileName = file.originalname || "submission";
    const size = file.size || 0;
    const uploadedAt = new Date();

    const answerMetadata = {
      fileUrl,
      fileType,
      mimeType,
      originalFileName,
      size,
      uploadedAt
    };

    // 4. Atomic Find/Upsert to avoid race conditions
    const updatePath = `answers.${questionNo}`;
    await Answers.findOneAndUpdate(
      { uploaded_student: session.student, for_exam: session.exam },
      { $set: { [updatePath]: answerMetadata } },
      { upsert: true, new: true }
    );

    res.json({ success: true, fileUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};


//Reupload or change answer sheet
export const reuploadAnswer = async (req, res) => {
  try {
    const { token, questionNo } = req.body;
    const file = req.file;

    if (!file || !token || !questionNo) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const session = await Upload.findOne({ token, student: req.user.id });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Invalid session",
      });
    }

    if (Date.now() > session.expiresAt.getTime()) {
      return res.status(403).json({ error: "Time over" });
    }

    const doc = await Answers.findOne({
      uploaded_student: session.student,
      for_exam: session.exam,
    });

    if (!doc || !doc.answers || !doc.answers.has(String(questionNo))) {
      return res.status(400).json({
        success: false,
        message: "No existing answer to replace",
      });
    }

    // Upload new file
    const mimeType = file.mimetype || "application/octet-stream";
    const ext = mimeType === "application/pdf" ? "pdf" : (file.originalname ? file.originalname.split('.').pop() : "jpg");
    const fileNameWithExt = `${session.student}_${session.exam}_q${questionNo}.${ext}`;

    const folderPath = await getFolderStructure(session.student, session.exam);

    const uploadResponse = await imagekit.upload({
      file: file.buffer,
      fileName: fileNameWithExt,
      folder: folderPath,
    });

    const fileUrl = uploadResponse.url;
    const fileType = mimeType === "application/pdf" ? "pdf" : (mimeType.startsWith("image/") ? "image" : "unknown");
    const originalFileName = file.originalname || "submission";
    const size = file.size || 0;
    const uploadedAt = new Date();

    const answerMetadata = {
      fileUrl,
      fileType,
      mimeType,
      originalFileName,
      size,
      uploadedAt
    };

    // overwrite atomically
    const updatePath = `answers.${questionNo}`;
    await Answers.findOneAndUpdate(
      { uploaded_student: session.student, for_exam: session.exam },
      { $set: { [updatePath]: answerMetadata } }
    );

    return res.status(200).json({
      success: true,
      message: "Answer updated",
      fileUrl,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const finalizeSubmission = async (req, res) => {
  try {
    const { token } = req.body;
    const studentId = req.user.id; 

    // Find and delete the active session
    const deletedSession = await Upload.findOneAndDelete({ 
      token: token, 
      student: studentId 
    });

    if (!deletedSession) {
      return res.status(400).json({ success: false, message: "No active upload session found. It may have already expired or been submitted." });
    }

    res.status(200).json({ success: true, message: "Exam submitted successfully! Upload window is now closed." });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};