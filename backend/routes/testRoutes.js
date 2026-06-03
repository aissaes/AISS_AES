import express from "express";
import multer from "multer";
import Answers from "../models/answer.js";
import Exam from "../models/exam.js";
import Result from "../models/result.js";
import QuestionPaper from "../models/questionPapers.js";
import imagekit from "../configurations/imageKit.js";
import axios from "axios";

const testRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const AI_BASE_URL = process.env.PYTHON_AGENT_URL || "http://127.0.0.1:10000";

// Secret Testing Route 1: Direct mock answer upload (bypasses student auth and upload sessions)
testRouter.post(
  "/test/upload-answer",
  upload.single("file"),
  async (req, res) => {
    try {
      const { examId, studentId, questionNo } = req.body;
      const file = req.file;

      if (!file || !examId || !studentId || !questionNo) {
        return res.status(400).json({ success: false, message: "Missing required fields (file, examId, studentId, questionNo)." });
      }

      // 1. Upload to ImageKit
      const uploadResponse = await imagekit.upload({
        file: file.buffer,
        fileName: `${studentId}_${examId}_q${questionNo}`,
        folder: `/answers/${examId}/${studentId}`,
      });

      const fileUrl = uploadResponse.url;

      // 2. Find/Create Answers doc
      let doc = await Answers.findOne({
        uploaded_student: studentId,
        for_exam: examId,
      });

      if (!doc) {
        doc = await Answers.create({
          uploaded_student: studentId,
          for_exam: examId,
          answers: {},
        });
      }

      // 3. Save URL for the questionNo
      doc.answers.set(String(questionNo), fileUrl);
      await doc.save();

      return res.status(200).json({
        success: true,
        message: `Answer page for Question ${questionNo} uploaded successfully!`,
        fileUrl,
        doc
      });
    } catch (error) {
      console.error("Test upload error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Secret Testing Route 2: Direct material upload & vectorization (bypasses faculty assigned check)
testRouter.post(
  "/test/upload-material",
  upload.single("file"),
  async (req, res) => {
    try {
      const { examId, contentType, questionId } = req.body;
      const file = req.file;

      if (!file || !examId || !contentType) {
        return res.status(400).json({ success: false, message: "Missing required fields (file, examId, contentType)." });
      }

      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ success: false, message: "Exam not found." });
      }

      // Upload to ImageKit
      const uploadResponse = await imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder: "/teacher_materials",
        useUniqueFileName: true
      });

      const fileUrl = uploadResponse.url;
      const namespace = exam.collegeId.toString();

      // Send to AI for vectorization
      const payload = {
        raw_input: fileUrl,
        content_type: contentType,
        subject: exam.subjectName,
        exam_id: examId,
        namespace: namespace
      };

      if (contentType === "answer_key") {
        payload.question_id = questionId;
      }

      const aiResponse = await axios.post(`${AI_BASE_URL}/teacher/upload`, payload);

      return res.status(200).json({
        success: true,
        message: "Material successfully uploaded and vectorized by the AI.",
        fileUrl,
        aiResponse: aiResponse.data
      });
    } catch (error) {
      console.error("Test material upload error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Secret Testing Route 3: Trigger AI evaluation directly (bypasses assigned faculty checks)
testRouter.post(
  "/test/trigger-evaluate",
  async (req, res) => {
    try {
      const { examId, studentId } = req.body;

      if (!examId || !studentId) {
        return res.status(400).json({ success: false, message: "Missing required fields (examId, studentId)." });
      }

      const exam = await Exam.findById(examId);
      if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });

      const paper = await QuestionPaper.findById(exam.questionPaper);
      if (!paper) return res.status(404).json({ success: false, message: "Question paper data is missing." });

      const submission = await Answers.findOne({ for_exam: examId, uploaded_student: studentId });
      if (!submission) return res.status(400).json({ success: false, message: "No submission found for this student." });

      let resultDoc = await Result.findOne({ student: studentId, exam: examId });
      if (!resultDoc) {
        resultDoc = await Result.create({
          student: studentId,
          exam: examId,
          questionPaper: exam.questionPaper,
          evaluations: [],
          status: "Evaluating"
        });
      } else {
        resultDoc.status = "Evaluating";
        await resultDoc.save();
      }

      // Perform evaluation trigger
      const evaluationPromises = Array.from(submission.answers.entries()).map(async ([questionNoStr, imageUrl]) => {
        try {
          let questionText = "Question text missing";
          let maxMarks = 10;

          for (const section of paper.sections) {
            for (const q of section) {
              if (q.questionId === questionNoStr) {
                questionText = q.text;
                maxMarks = q.marks;
              } else if (q.children && q.children.length > 0) {
                for (const sub of q.children) {
                  if (sub.questionId === questionNoStr) {
                    questionText = sub.text;
                    maxMarks = sub.marks;
                  }
                }
              }
            }
          }

          const payload = {
            image_url: imageUrl,
            question_id: questionNoStr,
            question_text: questionText,
            max_marks: maxMarks,
            exam_id: examId,
            student_id: studentId,
            namespace: exam.collegeId.toString()
          };

          const aiResponse = await axios.post(`${AI_BASE_URL}/evaluate`, payload);
          const { score, feedback } = aiResponse.data;

          return {
            questionId: questionNoStr,
            score: score || 0,
            feedback: feedback || "AI Evaluation completed.",
            status: "Completed"
          };
        } catch (err) {
          console.error(`AI Evaluation failed for question ${questionNoStr}:`, err.message);
          return {
            questionId: questionNoStr,
            score: 0,
            feedback: `Failed: ${err.message}`,
            status: "Failed"
          };
        }
      });

      const evaluations = await Promise.all(evaluationPromises);

      // Save to results
      let totalMarksObtained = 0;
      resultDoc.evaluations = evaluations.map(e => {
        if (e.status === "Completed") totalMarksObtained += e.score;
        return e;
      });

      resultDoc.totalMarksObtained = totalMarksObtained;
      resultDoc.status = "Completed";
      await resultDoc.save();

      return res.status(200).json({
        success: true,
        message: "AI evaluation completed successfully.",
        result: resultDoc
      });
    } catch (error) {
      console.error("Test trigger evaluation error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default testRouter;
