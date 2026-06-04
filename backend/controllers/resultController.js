import Result from "../models/result.js";
import Answers from "../models/answer.js";
import Exam from "../models/exam.js";

// ==========================================
// 1. GET EXAM OVERVIEW (ALL STUDENTS)
// ==========================================
export const getExamResultsOverview = async (req, res) => {
  try {
    const { examId } = req.params;
    const facultyId = req.user.id;

    // Security Check
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });
    if (exam.assignedFaculty.toString() !== facultyId) {
      return res.status(403).json({ success: false, message: "Unauthorized to view these results." });
    }

    // Fetch all results, populate student details
    const results = await Result.find({ exam: examId })
      .populate("student", "name rollNumber")
      .select("student totalMarksObtained status updatedAt"); 

    res.status(200).json({
      success: true,
      count: results.length,
      results: results
    });

  } catch (error) {
    console.error("Error fetching results overview:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ==========================================
// 2. GET SINGLE STUDENT DEEP DIVE
// ==========================================
export const getStudentDetailedResult = async (req, res) => {
  try {
    const { examId, studentId } = req.params;
    const facultyId = req.user.id;

    // Security Check
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });
    if (exam.assignedFaculty.toString() !== facultyId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    // 1. Fetch AI Result Data
    const resultDoc = await Result.findOne({ exam: examId, student: studentId })
      .populate("student", "name rollNumber email");

    if (!resultDoc) {
      return res.status(404).json({ success: false, message: "Result not found for this student." });
    }

    // 2. Fetch the Student's Uploaded Images
    const submission = await Answers.findOne({ for_exam: examId, uploaded_student: studentId });

    // 3. MERGE LOGIC: Combine Images with AI Feedback
    const detailedEvaluations = resultDoc.evaluations.map(evaluation => {
      const answerVal = submission ? submission.answers.get(evaluation.questionId) : null;
      let fileUrl = null;
      let fileType = "unknown";
      let mimeType = "application/octet-stream";
      let originalFileName = "unknown";
      let size = 0;
      let uploadedAt = null;

      if (answerVal) {
        if (typeof answerVal === "object") {
          fileUrl = answerVal.fileUrl || null;
          fileType = answerVal.fileType || "unknown";
          mimeType = answerVal.mimeType || "application/octet-stream";
          originalFileName = answerVal.originalFileName || "unknown";
          size = typeof answerVal.size === "number" ? answerVal.size : 0;
          uploadedAt = answerVal.uploadedAt || null;
        } else if (typeof answerVal === "string") {
          fileUrl = answerVal;
          const isPdf = answerVal.toLowerCase().includes(".pdf");
          fileType = isPdf ? "pdf" : "image";
          mimeType = isPdf ? "application/pdf" : "image/png";
          originalFileName = "migrated_submission" + (isPdf ? ".pdf" : ".png");
        }
      }
      
      return {
        questionId: evaluation.questionId,
        imageUrl: fileUrl, // legacy alias
        fileUrl,
        fileType,
        mimeType,
        originalFileName,
        size,
        uploadedAt,
        aiMarks: evaluation.aiMarks,
        aiReasoning: evaluation.aiReasoning,
        aiFeedback: evaluation.aiFeedback,
        overrideMarks: evaluation.overrideMarks,
        overrideReason: evaluation.overrideReason
      };
    });

    res.status(200).json({
      success: true,
      student: resultDoc.student,
      totalMarksObtained: resultDoc.totalMarksObtained,
      status: resultDoc.status,
      evaluations: detailedEvaluations
    });

  } catch (error) {
    console.error("Error fetching detailed result:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ==========================================
// 3. STUDENT: GET ALL ATTEMPTED EXAMS (DASHBOARD)
// ==========================================
export const getMyExamsList = async (req, res) => {
  try {
    const studentId = req.user.id; // Securely pulled from student token

    // Find every result document belonging to this student
    // Populate the exam details so the frontend can show titles, codes, and dates
    const myResults = await Result.find({ student: studentId })
      .populate("exam", "subjectName subjectCode examType date maxMarks resultsPublished")
      .select("exam totalMarksObtained status updatedAt") // Keep payload lightweight
      .sort({ updatedAt: -1 }); // Show most recently graded exams first

    if (!myResults || myResults.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "You haven't attempted any exams yet, or they haven't been released.",
        exams: [] 
      });
    }

    // Only return exam results where the results are published by the faculty
    const publishedResults = myResults.filter(r => r.exam && r.exam.resultsPublished === true);

    res.status(200).json({
      success: true,
      count: publishedResults.length,
      exams: publishedResults
    });

  } catch (error) {
    console.error("Error fetching student exams list:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};


// ==========================================
// 4. STUDENT: VIEW MY OWN RESULT
// ==========================================
export const getMyResult = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id; // Extracted securely from the student's auth token

    // 1. Fetch the Result Document
    const resultDoc = await Result.findOne({ exam: examId, student: studentId })
      .populate("exam", "subjectName subjectCode examType maxMarks resultsPublished"); // Bring in exam details

    if (!resultDoc) {
      return res.status(404).json({ 
        success: false, 
        message: "Result not found. Your exam might still be under evaluation." 
      });
    }

    // Ensure results are explicitly published by the faculty
    if (!resultDoc.exam || resultDoc.exam.resultsPublished !== true) {
      return res.status(403).json({
        success: false,
        message: "Results for this exam have not been published yet by the course instructor."
      });
    }

    // 2. Fetch the Student's Uploaded Images
    const submission = await Answers.findOne({ for_exam: examId, uploaded_student: studentId });

    // 3. Merge Data for the Student UI
    const detailedEvaluations = resultDoc.evaluations.map(evaluation => {
      const answerVal = submission ? submission.answers.get(evaluation.questionId) : null;
      let fileUrl = null;
      let fileType = "unknown";
      let mimeType = "application/octet-stream";
      let originalFileName = "unknown";
      let size = 0;
      let uploadedAt = null;

      if (answerVal) {
        if (typeof answerVal === "object") {
          fileUrl = answerVal.fileUrl || null;
          fileType = answerVal.fileType || "unknown";
          mimeType = answerVal.mimeType || "application/octet-stream";
          originalFileName = answerVal.originalFileName || "unknown";
          size = typeof answerVal.size === "number" ? answerVal.size : 0;
          uploadedAt = answerVal.uploadedAt || null;
        } else if (typeof answerVal === "string") {
          fileUrl = answerVal;
          const isPdf = answerVal.toLowerCase().includes(".pdf");
          fileType = isPdf ? "pdf" : "image";
          mimeType = isPdf ? "application/pdf" : "image/png";
          originalFileName = "migrated_submission" + (isPdf ? ".pdf" : ".png");
        }
      }
      
      // If the teacher overrode the grade, show that one. Otherwise, show AI marks.
      const isOverridden = evaluation.overrideMarks !== null && evaluation.overrideMarks !== undefined;
      const finalMarks = isOverridden ? evaluation.overrideMarks : evaluation.aiMarks;

      return {
        questionId: evaluation.questionId,
        imageUrl: fileUrl, // legacy alias
        fileUrl,
        fileType,
        mimeType,
        originalFileName,
        size,
        uploadedAt,
        marksAwarded: finalMarks,
        isManuallyGraded: isOverridden, // Lets the frontend show a "Teacher Graded" badge!
        feedback: evaluation.aiFeedback, // Give the student the constructive feedback
        reasoning: evaluation.aiReasoning,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weakness,
        overrideReason: isOverridden ? evaluation.overrideReason : null
      };
    });

    res.status(200).json({
      success: true,
      examDetails: resultDoc.exam,
      totalMarksObtained: resultDoc.totalMarksObtained,
      status: resultDoc.status,
      evaluations: detailedEvaluations
    });

  } catch (error) {
    console.error("Error fetching student result:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};