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

const testRouter = express.Router();

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
    const payload = {
      raw_input: fileUrl,
      content_type: contentType,
      subject: sandbox.subjectName,
      exam_id: sandbox.examId.toString(),
      namespace: sandbox.collegeId.toString()
    };

    if (contentType === "answer_key") {
      payload.question_id = "Q1";
    }

    const aiResponse = await axios.post(`${AI_BASE_URL}/teacher/upload`, payload);

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

// Helper for OCR Space API
const runOcrDirect = async (fileUrl) => {
  const ocrApiKey = process.env.OCR_SPACE_API_KEY;
  if (!ocrApiKey) {
    throw new Error("OCR_SPACE_API_KEY is not defined in backend environment variables.");
  }

  const formData = new URLSearchParams();
  formData.append("apikey", ocrApiKey);
  formData.append("url", fileUrl);
  formData.append("language", "eng");
  formData.append("OCREngine", "2");

  const response = await axios.post("https://api.ocr.space/parse/image", formData.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  if (response.data?.IsErroredOnProcessing) {
    throw new Error(response.data?.ErrorMessage || "OCR processing failed.");
  }

  const parsedResults = response.data?.ParsedResults || [];
  return parsedResults.map(p => p.ParsedText).filter(Boolean).join("\n\n");
};

// Helper for direct LLM evaluation
const runEvaluationDirect = async ({ studentAnswer, answerKey, contextNotes, maxMarks }) => {
  const prompt = `You are an expert academic evaluator. Your task is to grade a student's answer based on the provided Teacher's Answer Key and additional Contextual Notes.

### TEACHER'S ANSWER KEY:
${answerKey}

### CONTEXTUAL NOTES:
${contextNotes || "None"}

### STUDENT'S ANSWER:
${studentAnswer}

### EVALUATION CRITERIA:
1. Accuracy: Does the answer align with the Teacher's Key?
2. Completeness: Does the student use relevant details found in the Contextual Notes?
3. Clarity: Is the explanation easy to understand?

### OUTPUT FORMAT:
You MUST respond with ONLY a valid JSON object. 

{
  "score": <number from 0 to ${maxMarks}>,
  "reasoning": "<overall evaluation reasoning>",
  "strengths": "<what the student got right>",
  "weaknesses": "<what was missing, incorrect, or unclear>",
  "feedback": "<corrective feedback and suggestions for improvement>"
}`;

  // Try Groq first
  if (process.env.GROQ_API_KEY) {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      return response.data?.choices?.[0]?.message?.content;
    } catch (err) {
      console.error("Groq direct call failed, trying Gemini:", err.response?.data || err.message);
    }
  }

  // Try Gemini next
  if (process.env.GOOGLE_API_KEY) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1
          }
        }
      );
      return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (err) {
      console.error("Gemini direct call failed:", err.response?.data || err.message);
      throw new Error(`AI direct call failed (Groq and Gemini both failed or unavailable). last error: ${err.message}`);
    }
  }

  throw new Error("Neither GROQ_API_KEY nor GOOGLE_API_KEY is configured in backend environment.");
};

// 2. OCR Test Endpoint
testRouter.post("/test/sandbox/ocr", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "Missing file." });
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

    // Call Python full evaluate endpoint
    const aiResponse = await axios.post(`${AI_BASE_URL}/student/evaluate`, {
      raw_input: fileUrl,
      question: questionText,
      max_marks: Number(maxMarks) || 10,
      exam_id: sandbox.examId.toString(),
      namespace: sandbox.collegeId.toString(),
      question_id: "Q1"
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

// 5. Cleanup Endpoint
testRouter.delete("/test/sandbox/cleanup", async (req, res) => {
  try {
    const college = await College.findOne({ collegeName: "AISS AI Sandbox College" });
    if (college) {
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

export default testRouter;
