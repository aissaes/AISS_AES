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
      // Extract the image URL using the questionNo as the Map key
      const imageUrl = submission ? submission.answers.get(evaluation.questionId) : null;
      
      return {
        questionId: evaluation.questionId,
        imageUrl: imageUrl, 
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
      .populate("exam", "subjectName subjectCode examType date maxMarks")
      .select("exam totalMarksObtained status updatedAt") // Keep payload lightweight
      .sort({ updatedAt: -1 }); // Show most recently graded exams first

    if (!myResults || myResults.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "You haven't attempted any exams yet, or they haven't been graded.",
        exams: [] 
      });
    }

    res.status(200).json({
      success: true,
      count: myResults.length,
      exams: myResults
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
      .populate("exam", "subjectName subjectCode examType maxMarks"); // Bring in exam details

    if (!resultDoc) {
      return res.status(404).json({ 
        success: false, 
        message: "Result not found. Your exam might still be under evaluation." 
      });
    }

    // 2. Fetch the Student's Uploaded Images
    const submission = await Answers.findOne({ for_exam: examId, uploaded_student: studentId });

    // 3. Merge Data for the Student UI
    const detailedEvaluations = resultDoc.evaluations.map(evaluation => {
      const imageUrl = submission ? submission.answers.get(evaluation.questionId) : null;
      
      // If the teacher overrode the grade, show that one. Otherwise, show AI marks.
      const isOverridden = evaluation.overrideMarks !== null && evaluation.overrideMarks !== undefined;
      const finalMarks = isOverridden ? evaluation.overrideMarks : evaluation.aiMarks;

      return {
        questionId: evaluation.questionId,
        imageUrl: imageUrl, 
        marksAwarded: finalMarks,
        isManuallyGraded: isOverridden, // Lets the frontend show a "Teacher Graded" badge!
        feedback: evaluation.aiFeedback, // Give the student the constructive feedback
        reasoning: evaluation.aiReasoning
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