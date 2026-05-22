import Answers from "../../models/answer.js";
import Exam from "../../models/exam.js"
import axios from "axios";
import QuestionPaper from "../../models/questionPapers.js"; 
import Result from "../../models/result.js";

// 1. get all the students details who appeared for this exam

export const getAllStudentsAppearedForExam = async (req, res) => {
  try {
    const { examId } = req.params;

    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Check exam exists
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // 2. Authorization check
    const isHOD = userRole === "HOD";
    const isSuperAdmin = userRole === "SUPERADMIN";
    const isCreator =
      userRole === "FACULTY" &&
      exam.createdBy.toString() === userId;

    if (!isHOD && !isSuperAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // 3. Get students who appeared (from Answers collection)
    const students = await Answers.find({
      for_exam: examId,
    })
      .populate("uploaded_student", "name email rollNumber")
      .select("uploaded_student");

    // 4. Format response
    const result = students.map((entry) => entry.uploaded_student);

    return res.status(200).json({
      success: true,
      count: result.length,
      students: result,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



// ==========================================
// 2. TRIGGER AI EVALUATION (STUDENTS)
// ==========================================
export const triggerAIEvaluation = async (req, res) => {
  try {
    const { examId } = req.params;
    const facultyId = req.user.id; 

    // 1. Validate Exam & Permissions
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });
    if (exam.assignedFaculty.toString() !== facultyId) return res.status(403).json({ success: false, message: "Unauthorized." });
    if (!exam.isPaperQuestionUploaded) return res.status(400).json({ success: false, message: "Question paper not uploaded." });

    // 2. Fetch the Question Paper 
    const paper = await QuestionPaper.findById(exam.questionPaper);
    if (!paper) return res.status(404).json({ success: false, message: "Question paper data is missing." });

    // 3. Fetch submissions
    const allSubmissions = await Answers.find({ for_exam: examId });
    if (allSubmissions.length === 0) return res.status(400).json({ success: false, message: "No submissions found." });

    // 4. Respond instantly to prevent frontend timeout
    res.status(200).json({ success: true, message: `Evaluation started for ${allSubmissions.length} students. Running in background.` });

    // 5. The Background Loop (Outer Loop: Per Student)
    for (const submission of allSubmissions) {
      
      // Initialize or fetch the Result document ONCE per student
      let resultDoc = await Result.findOne({ student: submission.uploaded_student, exam: examId });
      if (!resultDoc) {
        resultDoc = await Result.create({
          student: submission.uploaded_student,
          exam: examId,
          questionPaper: exam.questionPaper,
          evaluations: [],
          status: "Evaluating"
        });
      }

      // Inner Loop: Per Question
      for (const [questionNoStr, imageUrl] of submission.answers.entries()) {
        try {
          // Extract text for the AI (Now searches Sub-questions!)
          let questionText = "Question text missing"; 
          let maxMarks = 10;
          
          for (const section of paper.sections) {
            for (const q of section) {
              // Check main question
              if (q.questionId === questionNoStr) {
                questionText = q.text;
                maxMarks = q.marks;
                break;
              }
              // Check sub-questions (children)
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

          console.log(`\n🚀 Sending ${questionNoStr} for student ${submission.uploaded_student} to AI...`);

          // Hit Python API 
          const aiResponse = await axios.post("http://127.0.0.1:8000/student/evaluate", {
            raw_input: imageUrl,
            question: questionText,
            exam_id: examId,
            namespace: exam.collegeId.toString(), 
            question_id: questionNoStr ,
            max_marks: maxMarks
          });

          // 🛑 ADD THESE TWO DEBUG LINES:
          console.log("🔍 RAW AI RESPONSE:");
          console.log(JSON.stringify(aiResponse.data, null, 2));

          
          let score = 0;
          let reasoning = "Pending";
          let strengths= "";
          let weakness= "";
          let feedback = "";
          let aiOutput = aiResponse.data.evaluation;

          // 1. If Python sent a string, aggressively clean and parse it
          if (typeof aiOutput === 'string') {
            try {
              // Strip markdown ```json and ``` that Gemini likes to add
              const cleanedText = aiOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
              aiOutput = JSON.parse(cleanedText); 
            } catch (parseError) {
              console.log("⚠️ AI did not return JSON. Treating as error message.");
            }
          }

          // 2. Safely extract from the parsed object
          if (typeof aiOutput === 'object' && aiOutput !== null && aiOutput.score !== undefined) {
            score = Number(aiOutput.score) || 0;
            reasoning = aiOutput.reasoning || "";
            strengths=aiOutput.strengths || "";
            weakness=aiOutput.weaknesses || "";
            feedback = aiOutput.feedback || "";
          } else {
            // Fallback if the AI just apologized about missing data
            score = 0; 
            reasoning = typeof aiOutput === 'string' ? aiOutput : "Evaluation failed format.";
          }
          // ==========================================

          // Update the specific question in the result array
          const existingEvalIndex = resultDoc.evaluations.findIndex(e => e.questionId === questionNoStr);

          if (existingEvalIndex >= 0) {
            resultDoc.evaluations[existingEvalIndex].aiMarks = score;
            resultDoc.evaluations[existingEvalIndex].aiReasoning = reasoning;
            resultDoc.evaluations[existingEvalIndex].strengths = strengths; 
            resultDoc.evaluations[existingEvalIndex].weakness = weakness;
            resultDoc.evaluations[existingEvalIndex].aiFeedback = feedback;
          } else {
            resultDoc.evaluations.push({
              questionId: questionNoStr,
              aiMarks: score,
              aiReasoning: reasoning,
              strengths: strengths, 
              weakness: weakness,
              aiFeedback: feedback
            });
          }
        } catch (aiError) {
          console.error(`❌ AI failed for ${questionNoStr}:`, aiError.message);
        }
      } // End Inner Loop

      // Recalculate Final Total & Save ONCE per student
      let finalTotal = 0;
      for (const ev of resultDoc.evaluations) {
        finalTotal += (ev.overrideMarks !== null) ? ev.overrideMarks : ev.aiMarks;
      }
      
      resultDoc.totalMarksObtained = finalTotal;
      resultDoc.status = "Completed"; 

      await resultDoc.save();
      console.log(`✅ Student ${submission.uploaded_student} grading finalized! Total Marks: ${finalTotal}`);
      
    } // End Outer Loop

  } catch (error) {
    console.error("Trigger Evaluation Error:", error);
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

    // 1. Fetch the Exam
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });

    // 2. SECURITY CHECK
    if (exam.assignedFaculty.toString() !== facultyId) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized: Only the assigned faculty can upload reference materials for this exam." 
      });
    }

    const namespace = exam.collegeId.toString();
    console.log(`\n📤 Sending ${contentType} to AI for vectorization...`);

    // 3. Hit the Python Microservice (Removed /api prefix as requested)
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

    const aiResponse = await axios.post(
      "http://127.0.0.1:8000/teacher/upload",
      payload
    );

    console.log(`✅ AI Vectorization Complete:`, aiResponse.data);

    res.status(200).json({
      success: true,
      message: "Materials successfully uploaded and vectorized by the AI.",
      ai_status: aiResponse.data
    });

  } catch (error) {
    console.error("Teacher Upload Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during AI vectorization.", 
      error: error.message 
    });
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

    // 1. Security Check: Only the assigned teacher can change grades
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });
    if (exam.assignedFaculty.toString() !== facultyId) {
      return res.status(403).json({ success: false, message: "Unauthorized: Only the assigned faculty can override grades." });
    }

    // 2. Find the Student's Result Document
    const resultDoc = await Result.findOne({ exam: examId, student: studentId });
    if (!resultDoc) return res.status(404).json({ success: false, message: "Result not found." });

    // 3. Find the specific question and update it
    const evalIndex = resultDoc.evaluations.findIndex(e => e.questionId === questionId);
    if (evalIndex === -1) {
      return res.status(404).json({ success: false, message: "Question evaluation not found in this result." });
    }

    // Update the override fields
    resultDoc.evaluations[evalIndex].overrideMarks = overrideMarks;
    resultDoc.evaluations[evalIndex].overrideReason = overrideReason || "Teacher manually adjusted the score.";

    // 4. Recalculate Final Total Marks
    let newTotal = 0;
    for (const ev of resultDoc.evaluations) {
      // If an override exists (even if it's 0), use it. Otherwise, use the AI's marks.
      if (ev.overrideMarks !== null && ev.overrideMarks !== undefined) {
        newTotal += ev.overrideMarks;
      } else {
        newTotal += ev.aiMarks;
      }
    }
    
    resultDoc.totalMarksObtained = newTotal;

    // 5. Save the updated document
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