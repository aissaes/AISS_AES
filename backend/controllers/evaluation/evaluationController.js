import Answers from "../../models/answer.js";
import Exam from "../../models/exam.js"
import axios from "axios";
import QuestionPaper from "../../models/questionPapers.js"; 
import Result from "../../models/result.js";

// Define the Base URL (Defaults to local if the .env variable is missing)
const AI_BASE_URL = process.env.PYTHON_AGENT_URL || "http://127.0.0.1:10000";

// ==========================================
// 1. GET ALL STUDENTS APPEARED
// ==========================================
export const getAllStudentsAppearedForExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Check exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    // 2. Authorization check
    const isHOD = userRole === "HOD";
    const isSuperAdmin = userRole === "SUPERADMIN";
    const isCreator = userRole === "FACULTY" && exam.createdBy.toString() === userId;

    if (!isHOD && !isSuperAdmin && !isCreator) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    // 3. Get students who appeared
    const students = await Answers.find({ for_exam: examId })
      .populate("uploaded_student", "name email rollNumber")
      .select("uploaded_student");

    const result = students.map((entry) => entry.uploaded_student);

    return res.status(200).json({
      success: true,
      count: result.length,
      students: result,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// ==========================================
// 2. TRIGGER AI EVALUATION (PARALLEL EXECUTION)
// ==========================================
export const triggerAIEvaluation = async (req, res) => {
  try {
    const { examId } = req.params;
    const { studentId } = req.body; 
    const facultyId = req.user.id; 

    // 1. Validate Exam & Permissions
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });
    if (exam.assignedFaculty.toString() !== facultyId) return res.status(403).json({ success: false, message: "Unauthorized." });
    if (!exam.isPaperQuestionUploaded) return res.status(400).json({ success: false, message: "Question paper not uploaded." });

    // 2. Fetch the Question Paper 
    const paper = await QuestionPaper.findById(exam.questionPaper);
    if (!paper) return res.status(404).json({ success: false, message: "Question paper data is missing." });

    // 3. Fetch ONLY this specific student's submission
    const submission = await Answers.findOne({ for_exam: examId, uploaded_student: studentId });
    if (!submission) return res.status(400).json({ success: false, message: "No submission found for this student." });

    // 4. Initialize or fetch the Result document
    let resultDoc = await Result.findOne({ student: studentId, exam: examId });
    if (!resultDoc) {
      resultDoc = await Result.create({
        student: studentId,
        exam: examId,
        questionPaper: exam.questionPaper,
        evaluations: [],
        status: "Evaluating"
      });
    }

    // ==========================================
    // 5. Evaluate all questions IN PARALLEL
    // ==========================================
    console.log(`\n🚀 Sending ALL questions for student ${studentId} to AI simultaneously...`);

    const evaluationPromises = Array.from(submission.answers.entries()).map(async ([questionNoStr, imageUrl]) => {
      try {
        let questionText = "Question text missing"; 
        let maxMarks = 10;
        
        for (const section of paper.sections) {
          for (const q of section) {
            if (q.questionId === questionNoStr) {
              questionText = q.text;
              maxMarks = q.marks;
              break;
            }
            if (q.children && q.children.length > 0) {
              const foundSub = q.children.find(sub => sub.questionId === questionNoStr);
              if (foundSub) {
                questionText = foundSub.text;
                maxMarks = foundSub.marks;
                break;
              }
            }
          }
          if (questionText !== "Question text missing") break;
        }

        const aiResponse = await axios.post(`${AI_BASE_URL}/student/evaluate`, {
          raw_input: imageUrl,
          question: questionText,
          exam_id: examId,
          namespace: exam.collegeId.toString(), 
          question_id: questionNoStr,
          max_marks: maxMarks
        });

        let score = 0, reasoning = "Pending", strengths = "", weakness = "", feedback = "";
        let aiOutput = aiResponse.data.evaluation;

        if (typeof aiOutput === 'string') {
          try {
            const cleanedText = aiOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
            aiOutput = JSON.parse(cleanedText); 
          } catch (e) {}
        }

        if (typeof aiOutput === 'object' && aiOutput !== null && aiOutput.score !== undefined) {
          score = Number(aiOutput.score) || 0;
          reasoning = aiOutput.reasoning || "";
          strengths = aiOutput.strengths || "";
          weakness = aiOutput.weaknesses || "";
          feedback = aiOutput.feedback || "";
        } else {
          reasoning = typeof aiOutput === 'string' ? aiOutput : "Evaluation failed format.";
        }

        return { questionNoStr, score, reasoning, strengths, weakness, feedback };

      } catch (aiError) {
        const exactReason = aiError.response?.data?.detail || aiError.response?.data?.message || aiError.message || "Unknown AI error";
        console.error(`❌ AI failed for question ${questionNoStr}:`, exactReason);
        return { questionNoStr, score: 0, reasoning: `AI Error: ${exactReason}`, strengths: "", weakness: "", feedback: "" };
      }
    });

    // 🛑 WAIT FOR ALL QUESTIONS TO FINISH AT THE SAME TIME
    const aiResults = await Promise.all(evaluationPromises);

    // ==========================================
    // 6. Update Database and Save
    // ==========================================
    let finalTotal = 0;

    for (const resData of aiResults) {
      const existingEvalIndex = resultDoc.evaluations.findIndex(e => e.questionId === resData.questionNoStr);

      if (existingEvalIndex >= 0) {
        resultDoc.evaluations[existingEvalIndex].aiMarks = resData.score;
        resultDoc.evaluations[existingEvalIndex].aiReasoning = resData.reasoning;
        resultDoc.evaluations[existingEvalIndex].strengths = resData.strengths; 
        resultDoc.evaluations[existingEvalIndex].weakness = resData.weakness;
        resultDoc.evaluations[existingEvalIndex].aiFeedback = resData.feedback;
      } else {
        resultDoc.evaluations.push({
          questionId: resData.questionNoStr,
          aiMarks: resData.score,
          aiReasoning: resData.reasoning,
          strengths: resData.strengths, 
          weakness: resData.weakness,
          aiFeedback: resData.feedback
        });
      }
    }

    for (const ev of resultDoc.evaluations) {
      finalTotal += (ev.overrideMarks !== null && ev.overrideMarks !== undefined) ? ev.overrideMarks : ev.aiMarks;
    }
    
    resultDoc.totalMarksObtained = finalTotal;
    resultDoc.status = "Completed"; 

    await resultDoc.save();
    console.log(`✅ Student ${studentId} grading finalized! Total Marks: ${finalTotal}`);

    // 7. SEND FINAL SUCCESS RESPONSE
    return res.status(200).json({ 
      success: true, 
      message: `Student evaluated successfully.`,
      totalMarks: finalTotal
    });
      
  } catch (error) {
    const exactReason = error.message || "Unknown server error";
    console.error("Trigger Evaluation Error:", exactReason);
    return res.status(500).json({ success: false, message: `Server Error: ${exactReason}` });
  }
};


// ==========================================
// 3. UPLOAD TEACHER MATERIALS (RUBRIC/NOTES)
// ==========================================
export const uploadTeacherMaterials = async (req, res) => {
  try {
    const { examId } = req.params;
    const { fileUrl, contentType, questionId } = req.body; 
    const facultyId = req.user.id; 

    if (!fileUrl || !contentType) {
      return res.status(400).json({ success: false, message: "File URL and Content Type are required." });
    }

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });

    if (exam.assignedFaculty.toString() !== facultyId) {
      return res.status(403).json({ success: false, message: "Unauthorized: Only assigned faculty can upload materials." });
    }

    const namespace = exam.collegeId.toString();
    console.log(`\n📤 Sending ${contentType} to AI for vectorization...`);

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
    console.log(`✅ AI Vectorization Complete:`, aiResponse.data);

    res.status(200).json({
      success: true,
      message: "Materials successfully uploaded and vectorized by the AI.",
      ai_status: aiResponse.data
    });

  } catch (error) {
    console.error("Teacher Upload Error:", error);
    res.status(500).json({ success: false, message: "Server error during AI vectorization.", error: error.message });
  }
};


// ==========================================
// 4. FACULTY: OVERRIDE AI MARKS
// ==========================================
export const overrideAIGrade = async (req, res) => {
  try {
    const { examId, studentId } = req.params;
    const { questionId, overrideMarks, overrideReason } = req.body;
    const facultyId = req.user.id;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });
    if (exam.assignedFaculty.toString() !== facultyId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const resultDoc = await Result.findOne({ exam: examId, student: studentId });
    if (!resultDoc) return res.status(404).json({ success: false, message: "Result not found." });

    const evalIndex = resultDoc.evaluations.findIndex(e => e.questionId === questionId);
    if (evalIndex === -1) {
      return res.status(404).json({ success: false, message: "Question evaluation not found." });
    }

    resultDoc.evaluations[evalIndex].overrideMarks = overrideMarks;
    resultDoc.evaluations[evalIndex].overrideReason = overrideReason || "Teacher manually adjusted the score.";

    let newTotal = 0;
    for (const ev of resultDoc.evaluations) {
      if (ev.overrideMarks !== null && ev.overrideMarks !== undefined) {
        newTotal += ev.overrideMarks;
      } else {
        newTotal += ev.aiMarks;
      }
    }
    
    resultDoc.totalMarksObtained = newTotal;
    await resultDoc.save();

    res.status(200).json({
      success: true,
      message: "Grade successfully overridden.",
      updatedTotal: newTotal,
      updatedEvaluation: resultDoc.evaluations[evalIndex]
    });

  } catch (error) {
    console.error("Override Error:", error);
    res.status(500).json({ success: false, message: "Server error during grade override." });
  }
};