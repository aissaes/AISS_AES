import express from "express";
import multer from "multer";
import axios from "axios";
import mongoose from "mongoose";
import imagekit from "../configurations/imageKit.js";
import College from "../models/college.js";
import Student from "../models/student.js";
import Exam from "../models/exam.js";
import QuestionPaper from "../models/questionPapers.js";
import Answers from "../models/answer.js";
import Result from "../models/result.js";
import Department from "../models/department.js";
import Semester from "../models/semester.js";
import Course from "../models/course.js";
import TeacherMaterial from "../models/teacherMaterial.js";

const testRouter = express.Router();

import { verifyToken } from "../middlewares/authMiddleware.js";

const restrictSandbox = (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return verifyToken(req, res, () => {
      const role = req.user?.role;
      if (role === "overallAdmin" || role === "collegeAdmin") {
        return next();
      }
      return res.status(403).json({ success: false, message: "Access denied. Sandbox is restricted to admins in production." });
    });
  }
  next();
};

testRouter.use(restrictSandbox);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  }
});

const AI_BASE_URL = process.env.PYTHON_AGENT_URL || "http://127.0.0.1:10000";

// Helper to get or create developer sandbox mock records
const getOrCreateSandboxRecords = async () => {
  // 1. Get or create college
  let college = await College.findOne({ collegeName: "AISS AI Sandbox College" });
  if (!college) {
    college = await College.create({
      collegeName: "AISS AI Sandbox College",
      location: "Sandbox Location",
      status: "Approved"
    });
  }

  // 2. Get or create department
  let department = await Department.findOne({ collegeId: college._id, code: "AISD" });
  if (!department) {
    department = await Department.create({
      collegeId: college._id,
      name: "AI Sandbox Department",
      code: "AISD",
      status: "Active"
    });
  }

  // 3. Get or create semester
  let semester = await Semester.findOne({ collegeId: college._id, semesterNumber: 1 });
  if (!semester) {
    semester = await Semester.create({
      collegeId: college._id,
      department: department._id,
      semesterNumber: 1,
      semesterName: "Sandbox Semester 1",
      academicYear: "2026-2027",
      status: "Active"
    });
  }

  // 4. Get or create course
  let course = await Course.findOne({ collegeId: college._id, courseCode: "AISD101" });
  if (!course) {
    course = await Course.create({
      collegeId: college._id,
      courseCode: "AISD101",
      courseName: "Sandbox Course",
      department: department._id,
      semester: semester._id,
      credits: 3,
      courseType: "Core",
      status: "Active"
    });
  }

  // 5. Get or create student
  let student = await Student.findOne({ email: "sandbox.student@aiss.edu" });
  if (!student) {
    student = await Student.create({
      name: "Sandbox Student",
      rollNumber: "AI-SANDBOX-STUDENT-001",
      email: "sandbox.student@aiss.edu",
      collegeId: college._id,
      semester: semester._id,
      password: "dummy_password_hash"
    });
  }

  // 6. Get or create dummy exam and question paper
  let exam = await Exam.findOne({ subjectName: "AI Sandbox Exam" });
  let paper = await QuestionPaper.findOne({ instructions: "Sandbox Test Paper Instructions" });

  const dummyFacultyId = new mongoose.Types.ObjectId();

  if (!exam) {
    exam = await Exam.create({
      collegeId: college._id,
      courseId: course._id,
      semesterId: semester._id,
      subjectName: "AI Sandbox Exam",
      subjectCode: "AI-SANDBOX",
      examType: "Mid Semester Examination",
      date: new Date(),
      maxMarks: 10,
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      assignedFaculty: dummyFacultyId,
      isPaperQuestionUploaded: true,
      resultsPublished: false
    });
  }

  if (!paper) {
    paper = await QuestionPaper.create({
      examId: exam._id,
      collegeId: college._id,
      createdBy: dummyFacultyId,
      instructions: ["Sandbox Test Paper Instructions"],
      sections: [[
        {
          questionId: "Q1",
          text: "Sandbox Test Question",
          marks: 10,
          choice: { attempt: 0, total: 0, compulsory: [], groups: [] },
          children: []
        }
      ]],
      sectionChoices: [{ attempt: 0, total: 1, compulsory: [], groups: [] }],
      status: "Approved"
    });

    exam.questionPaper = paper._id;
    await exam.save();
  }

  return {
    collegeId: college._id,
    studentId: student._id,
    paperId: paper._id,
    examId: exam._id,
    courseId: exam.courseId,
    facultyId: exam.assignedFaculty,
    subjectName: exam.subjectName
  };
};

// 1. Vector Test Endpoint
testRouter.post("/test/sandbox/vectorize", upload.single("file"), async (req, res) => {
  try {
    const { contentType } = req.body;
    const file = req.file;

    if (!file || !contentType) {
      return res.status(400).json({ success: false, message: "Missing file or contentType." });
    }

    if (file.mimetype !== "application/pdf") {
      return res.status(400).json({ success: false, message: "Invalid file type. Only PDFs are allowed for vectorization." });
    }

    const sandbox = await getOrCreateSandboxRecords();

    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: file.buffer,
      fileName: file.originalname,
      folder: "/teacher_materials",
      useUniqueFileName: true
    });

    const fileUrl = uploadResponse.url;

    // Call Python teacher upload service
    // Call Python teacher upload service
    const payload = {
      raw_input: fileUrl,
      content_type: contentType,
      subject: sandbox.subjectName,
      exam_id: sandbox.examId.toString(),
      namespace: `sandbox-${sandbox.collegeId.toString()}`,
      material_id: new mongoose.Types.ObjectId().toString(),
      course_id: sandbox.courseId.toString(),
      faculty_id: sandbox.facultyId.toString()
    };

    if (contentType === "answer_key") {
      payload.question_id = "Q1";
    }

    const apiKey = process.env.PYTHON_AGENT_KEY;
    if (!apiKey) throw new Error("PYTHON_AGENT_KEY environment variable is not configured.");

    const aiResponse = await axios.post(`${AI_BASE_URL}/teacher/upload`, payload, {
      headers: {
        "X-API-Key": apiKey
      }
    });

    return res.status(200).json({
      success: true,
      message: "Vectorization complete.",
      fileUrl,
      aiResponse: aiResponse.data
    });
  } catch (error) {
    console.error("Sandbox Vectorize Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ImageKit Auth Endpoint for Client-Side Direct Upload
testRouter.get("/test/sandbox/imagekit/auth", async (req, res) => {
  try {
    const { uploadType } = req.query;
    const authParams = imagekit.getAuthenticationParameters();

    let folder = "/sandbox";
    let fileName = `file_${Date.now()}`;

    const sandbox = await getOrCreateSandboxRecords();

    if (uploadType === "vectorize") {
      folder = "/teacher_materials";
    } else if (uploadType === "ocr") {
      folder = "/answer_scripts";
    } else if (uploadType === "full") {
      folder = `/answers/${sandbox.examId}/${sandbox.studentId}`;
      fileName = `student_page_${Date.now()}`;
    }

    return res.status(200).json({
      ...authParams,
      publicKey: imagekit.options.publicKey || process.env.IMAGEKIT_PUBLIC_KEY,
      folder,
      fileName
    });
  } catch (error) {
    console.error("ImageKit Auth Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Vectorize from ImageKit URL Endpoint
testRouter.post("/test/sandbox/vectorize-by-url", async (req, res) => {
  try {
    const { fileUrl, contentType } = req.body;

    if (!fileUrl || !contentType) {
      return res.status(400).json({ success: false, message: "Missing fileUrl or contentType." });
    }

    const sandbox = await getOrCreateSandboxRecords();

    // Call Python teacher upload service
    const payload = {
      raw_input: fileUrl,
      content_type: contentType,
      subject: sandbox.subjectName,
      exam_id: sandbox.examId.toString(),
      namespace: `sandbox-${sandbox.collegeId.toString()}`,
      material_id: new mongoose.Types.ObjectId().toString(),
      course_id: sandbox.courseId.toString(),
      faculty_id: sandbox.facultyId.toString()
    };

    if (contentType === "answer_key") {
      payload.question_id = "Q1";
    }

    const apiKey = process.env.PYTHON_AGENT_KEY;
    if (!apiKey) throw new Error("PYTHON_AGENT_KEY environment variable is not configured.");

    const aiResponse = await axios.post(`${AI_BASE_URL}/teacher/upload`, payload, {
      headers: {
        "X-API-Key": apiKey
      }
    });

    return res.status(200).json({
      success: true,
      message: "Vectorization complete.",
      fileUrl,
      aiResponse: aiResponse.data
    });
  } catch (error) {
    console.error("Sandbox Vectorize by URL Error:", error.response?.data?.detail || error.message);
    return res.status(500).json({ success: false, error: error.response?.data?.detail || error.message });
  }
});

// Helper for OCR Space API delegating to Python Agent
const runOcrDirect = async (fileUrl) => {
  const apiKey = process.env.PYTHON_AGENT_KEY;
  if (!apiKey) throw new Error("PYTHON_AGENT_KEY environment variable is not configured.");

  const response = await axios.post(`${AI_BASE_URL}/testing/test`, {
    action: "ocr",
    file_url: fileUrl
  }, {
    headers: {
      "X-API-Key": apiKey
    }
  });
  if (!response.data?.success) {
    throw new Error(response.data?.detail || "Agent OCR processing failed.");
  }
  return response.data.extractedText;
};

// Helper for direct LLM evaluation delegating to Python Agent
const runEvaluationDirect = async ({ studentAnswer, answerKey, contextNotes, maxMarks }) => {
  const apiKey = process.env.PYTHON_AGENT_KEY;
  if (!apiKey) throw new Error("PYTHON_AGENT_KEY environment variable is not configured.");

  const response = await axios.post(`${AI_BASE_URL}/testing/test`, {
    action: "evaluate-text",
    studentAnswer,
    answerKey,
    contextNotes,
    maxMarks: Number(maxMarks) || 10
  }, {
    headers: {
      "X-API-Key": apiKey
    }
  });
  if (!response.data?.success) {
    throw new Error(response.data?.detail || "Agent direct evaluation failed.");
  }
  return response.data.evaluation;
};

// 2. OCR Test Endpoint
testRouter.post("/test/sandbox/ocr", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "Missing file." });
    }

    const allowedOcrMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedOcrMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({ success: false, message: "Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed for OCR." });
    }

    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: file.buffer,
      fileName: file.originalname,
      folder: "/answer_scripts",
      useUniqueFileName: true
    });

    const fileUrl = uploadResponse.url;

    // Call direct OCR Space API
    const extractedText = await runOcrDirect(fileUrl);

    return res.status(200).json({
      success: true,
      fileUrl,
      extractedText: extractedText || "No text detected."
    });
  } catch (error) {
    console.error("Sandbox OCR Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2b. OCR Test by URL
testRouter.post("/test/sandbox/ocr-by-url", async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) {
      return res.status(400).json({ success: false, message: "Missing fileUrl." });
    }

    // Call direct OCR Space API
    const extractedText = await runOcrDirect(fileUrl);

    return res.status(200).json({
      success: true,
      fileUrl,
      extractedText: extractedText || "No text detected."
    });
  } catch (error) {
    console.error("Sandbox OCR by URL Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Evaluation Test (Text-only)
testRouter.post("/test/sandbox/evaluate-text", async (req, res) => {
  try {
    const { studentAnswer, answerKey, contextNotes, maxMarks } = req.body;

    if (!studentAnswer || !answerKey) {
      return res.status(400).json({ success: false, message: "Missing studentAnswer or answerKey." });
    }

    const evaluationResult = await runEvaluationDirect({
      studentAnswer,
      answerKey,
      contextNotes,
      maxMarks
    });

    return res.status(200).json({
      success: true,
      aiResponse: {
        status: "success",
        evaluation: evaluationResult
      }
    });
  } catch (error) {
    console.error("Sandbox Text Eval Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Full Pipeline Evaluation Test
testRouter.post("/test/sandbox/evaluate-full", upload.single("file"), async (req, res) => {
  try {
    const { questionText, maxMarks } = req.body;
    const file = req.file;

    if (!file || !questionText) {
      return res.status(400).json({ success: false, message: "Missing file or questionText." });
    }

    const allowedOcrMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedOcrMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({ success: false, message: "Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed for evaluation." });
    }

    const sandbox = await getOrCreateSandboxRecords();

    // Upload answer sheet page to ImageKit
    const uploadResponse = await imagekit.upload({
      file: file.buffer,
      fileName: `student_page_${Date.now()}`,
      folder: `/answers/${sandbox.examId}/${sandbox.studentId}`,
      useUniqueFileName: true
    });

    const fileUrl = uploadResponse.url;

    // Run direct OCR so the user can see what handwriting text was parsed for diagnostics
    let extractedText = "";
    try {
      extractedText = await runOcrDirect(fileUrl);
    } catch (ocrErr) {
      console.warn("Direct OCR extraction for diagnostics failed:", ocrErr.message);
      extractedText = "OCR Extraction failed/unavailable in backend: " + ocrErr.message;
    }

    const apiKey = process.env.PYTHON_AGENT_KEY;
    if (!apiKey) throw new Error("PYTHON_AGENT_KEY environment variable is not configured.");

    // Call Python full evaluate endpoint
    const aiResponse = await axios.post(`${AI_BASE_URL}/student/evaluate`, {
      raw_input: fileUrl,
      question: questionText,
      max_marks: Number(maxMarks) || 10,
      exam_id: sandbox.examId.toString(),
      namespace: `sandbox-${sandbox.collegeId.toString()}`,
      question_id: "Q1"
    }, {
      headers: {
        "X-API-Key": apiKey
      }
    });

    // Enrich response with OCR diagnostic text for the UI
    const enrichedResponse = {
      ...aiResponse.data,
      extracted_text: extractedText,
      recheck_status: "AUDITED",
      revision_count: 1
    };

    return res.status(200).json({
      success: true,
      fileUrl,
      aiResponse: enrichedResponse
    });
  } catch (error) {
    console.error("Sandbox Full Eval Error:", error.response?.data?.detail || error.message);
    return res.status(500).json({ success: false, error: error.response?.data?.detail || error.message });
  }
});

// 4b. Full Pipeline Evaluation Test by URL
testRouter.post("/test/sandbox/evaluate-full-by-url", async (req, res) => {
  try {
    const { fileUrl, questionText, maxMarks } = req.body;

    if (!fileUrl || !questionText) {
      return res.status(400).json({ success: false, message: "Missing fileUrl or questionText." });
    }

    const sandbox = await getOrCreateSandboxRecords();

    // Run direct OCR so the user can see what handwriting text was parsed for diagnostics
    let extractedText = "";
    try {
      extractedText = await runOcrDirect(fileUrl);
    } catch (ocrErr) {
      console.warn("Direct OCR extraction for diagnostics failed:", ocrErr.message);
      extractedText = "OCR Extraction failed/unavailable in backend: " + ocrErr.message;
    }

    const apiKey = process.env.PYTHON_AGENT_KEY;
    if (!apiKey) throw new Error("PYTHON_AGENT_KEY environment variable is not configured.");

    // Call Python full evaluate endpoint
    const aiResponse = await axios.post(`${AI_BASE_URL}/student/evaluate`, {
      raw_input: fileUrl,
      question: questionText,
      max_marks: Number(maxMarks) || 10,
      exam_id: sandbox.examId.toString(),
      namespace: `sandbox-${sandbox.collegeId.toString()}`,
      question_id: "Q1"
    }, {
      headers: {
        "X-API-Key": apiKey
      }
    });

    // Enrich response with OCR diagnostic text for the UI
    const enrichedResponse = {
      ...aiResponse.data,
      extracted_text: extractedText,
      recheck_status: "AUDITED",
      revision_count: 1
    };

    return res.status(200).json({
      success: true,
      fileUrl,
      aiResponse: enrichedResponse
    });
  } catch (error) {
    console.error("Sandbox Full Eval by URL Error:", error.response?.data?.detail || error.message);
    return res.status(500).json({ success: false, error: error.response?.data?.detail || error.message });
  }
});

// 5. Cleanup Endpoint
testRouter.delete("/test/sandbox/cleanup", async (req, res) => {
  try {
    const college = await College.findOne({ collegeName: "AISS AI Sandbox College" });
    if (college) {
      const namespace = `sandbox-${college._id.toString()}`;
      const apiKey = process.env.PYTHON_AGENT_KEY;
      if (!apiKey) throw new Error("PYTHON_AGENT_KEY environment variable is not configured.");

      try {
        await axios.post(`${AI_BASE_URL}/testing/test`, {
          action: "cleanup-namespace",
          namespace: namespace
        }, {
          headers: {
            "X-API-Key": apiKey
          }
        });
      } catch (err) {
        console.error("Failed to delete sandbox namespace vectors from Pinecone:", err.message);
      }

      const exams = await Exam.find({ collegeId: college._id });
      const examIds = exams.map(e => e._id);
      
      // Delete answers, results, exams, students, courses, semesters, departments, and college
      await Answers.deleteMany({ for_exam: { $in: examIds } });
      await Result.deleteMany({ exam: { $in: examIds } });
      await Exam.deleteMany({ collegeId: college._id });
      await Student.deleteMany({ collegeId: college._id });
      await Course.deleteMany({ collegeId: college._id });
      await Semester.deleteMany({ collegeId: college._id });
      await Department.deleteMany({ collegeId: college._id });
      await College.deleteOne({ _id: college._id });
    }
    await QuestionPaper.deleteOne({ instructions: "Sandbox Test Paper Instructions" });

    return res.status(200).json({ success: true, message: "Sandbox mock objects deleted successfully." });
  } catch (error) {
    console.error("Sandbox Cleanup Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /test/admin/reconcile
testRouter.post("/test/admin/reconcile", async (req, res) => {
  try {
    // 1. Find and delete all pending materials older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const pendingMaterials = await TeacherMaterial.find({
      status: "pending",
      createdAt: { $lt: oneHourAgo }
    });
    
    let deletedPendingCount = 0;
    for (const mat of pendingMaterials) {
      if (mat.imageKitFileId && mat.imageKitFileId !== "unknown") {
        try {
          await imagekit.deleteFile(mat.imageKitFileId);
        } catch (ikErr) {
          console.error(`Failed to delete ImageKit file ${mat.imageKitFileId} for pending material:`, ikErr.message);
        }
      }
      await TeacherMaterial.findByIdAndDelete(mat._id);
      deletedPendingCount++;
    }

    // 2. Query all active materials and call Python agent to reconcile Pinecone vectors
    const allMaterials = await TeacherMaterial.find({}, "_id");
    const allMaterialIds = allMaterials.map(m => m._id.toString());

    let pythonAgentReconciliationStatus = "Skipped";
    try {
      const apiKey = process.env.PYTHON_AGENT_KEY;
      if (!apiKey) throw new Error("PYTHON_AGENT_KEY environment variable is not configured.");

      const aiResponse = await axios.post(`${AI_BASE_URL}/testing/reconcile-vectors`, {
        valid_material_ids: allMaterialIds
      }, {
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json"
        }
      });
      pythonAgentReconciliationStatus = aiResponse.data.message;
    } catch (aiErr) {
      console.error("Failed to reconcile Pinecone vectors via Python agent:", aiErr.message);
      pythonAgentReconciliationStatus = "Failed: " + aiErr.message;
    }

    // 3. Clean up ImageKit CDN files that are no longer referenced in Answers or TeacherMaterial schemas
    let ikFiles = [];
    try {
      ikFiles = await imagekit.listFiles({
        limit: 1000
      });
    } catch (ikListErr) {
      console.error("Failed to list files from ImageKit during reconciliation:", ikListErr.message);
    }

    const referencedMaterialFileIds = new Set(
      (await TeacherMaterial.find({}, "imageKitFileId")).map(m => m.imageKitFileId).filter(Boolean)
    );

    const answers = await Answers.find({});
    const referencedAnswerFileIds = new Set();
    for (const ansDoc of answers) {
      if (ansDoc.answers) {
        for (const [qId, ansFile] of ansDoc.answers.entries()) {
          if (ansFile && ansFile.imageKitFileId) {
            referencedAnswerFileIds.add(ansFile.imageKitFileId);
          }
        }
      }
    }

    let deletedImageKitFilesCount = 0;
    const deletedImageKitFiles = [];
    for (const file of ikFiles) {
      const fileId = file.fileId;
      if (!referencedMaterialFileIds.has(fileId) && !referencedAnswerFileIds.has(fileId)) {
        try {
          await imagekit.deleteFile(fileId);
          deletedImageKitFilesCount++;
          deletedImageKitFiles.push(file.name);
          console.log(`Deleted orphaned ImageKit file: ${fileId} (${file.name})`);
        } catch (delErr) {
          console.error(`Failed to delete orphaned ImageKit file ${fileId}:`, delErr.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      summary: {
        deletedPendingMaterialsCount: deletedPendingCount,
        deletedImageKitFilesCount,
        deletedImageKitFiles,
        pineconeReconciliation: pythonAgentReconciliationStatus
      }
    });

  } catch (error) {
    console.error("Reconciliation Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default testRouter;
