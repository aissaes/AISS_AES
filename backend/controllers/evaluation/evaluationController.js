import Answers from "../../models/answer.js";
import Exam from "../../models/exam.js"
import axios from "axios";
import QuestionPaper from "../../models/questionPapers.js";
import Result from "../../models/result.js";
import Student from "../../models/student.js";
import Upload from "../../models/uploadSession.js";
import TeacherMaterial from "../../models/teacherMaterial.js";
import imagekit from "../../configurations/imageKit.js";

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
    const normalizedRole = (userRole || "").toLowerCase();
    const isHOD = normalizedRole === "hod";
    const isSuperAdmin = normalizedRole === "collegeadmin" || normalizedRole === "superadmin";
    const isAssignedFaculty = normalizedRole === "faculty" && exam.assignedFaculty && exam.assignedFaculty.toString() === userId;

    if (!isHOD && !isSuperAdmin && !isAssignedFaculty) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    // 3. Get students who appeared (with pagination support)
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const totalCount = await Answers.countDocuments({ for_exam: examId });
    const students = await Answers.find({ for_exam: examId })
      .populate("uploaded_student", "name email rollNumber")
      .select("uploaded_student")
      .skip(skip)
      .limit(limit);

    const result = students.map((entry) => entry.uploaded_student);

    return res.status(200).json({
      success: true,
      totalCount,
      page,
      limit,
      count: result.length,
      students: result,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// ==========================================
// 2. TRIGGER AI EVALUATION (SYNCHRONOUS EXECUTION)
// ==========================================
async function limitConcurrency(tasks, limit) {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

export const triggerAIEvaluation = async (req, res) => {
  let examId;
  let studentId;
  try {
    examId = req.params.examId;
    studentId = req.body.studentId;
    const facultyId = req.user.id;

    // 1. Validate Exam & Permissions
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });
    if (exam.assignedFaculty.toString() !== facultyId) return res.status(403).json({ success: false, message: "Unauthorized." });
    if (!exam.isPaperQuestionUploaded) return res.status(400).json({ success: false, message: "Question paper not uploaded." });

    // 2. Fetch the Question Paper 
    const paper = await QuestionPaper.findById(exam.questionPaper);
    if (!paper) return res.status(404).json({ success: false, message: "Question paper data is missing." });

    // 3. Fetch and lock student's submission
    const submission = await Answers.findOneAndUpdate(
      { for_exam: examId, uploaded_student: studentId },
      { $set: { isLockedForEvaluation: true } },
      { new: true }
    );
    if (!submission) return res.status(400).json({ success: false, message: "No submission found for this student." });

    // 4. Assert that the student has no active upload session
    const activeSession = await Upload.findOne({ student: studentId, exam: examId });
    if (activeSession) {
      submission.isLockedForEvaluation = false;
      await submission.save();
      return res.status(400).json({
        success: false,
        message: "Student's upload session is still active. Please wait for the student to finalize submission or for the upload window to close."
      });
    }

    // 5. Initialize or fetch the Result document
    let resultDoc = await Result.findOne({ student: studentId, exam: examId });
    if (resultDoc && resultDoc.status === "Evaluating") {
      return res.status(400).json({ success: false, message: "AI evaluation is already in progress for this student." });
    }

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

    // 6. Compile questions to evaluate
    const questionsToEvaluate = [];
    for (const [questionNoStr, answerData] of submission.answers.entries()) {
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

      const fileUrl = (answerData && typeof answerData === "object") ? answerData.fileUrl : answerData;
      questionsToEvaluate.push({
        question_id: questionNoStr,
        question: questionText,
        max_marks: maxMarks,
        raw_input: fileUrl
      });
    }

    // 7. Fire async evaluation task on Python microservice
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const webhookUrl = `${backendUrl}/faculty/exam/webhook-callback`;

    const payload = {
      student_id: studentId.toString(),
      exam_id: examId.toString(),
      course_id: exam.courseId.toString(),
      namespace: exam.collegeId.toString(),
      webhook_url: webhookUrl,
      questions: questionsToEvaluate
    };

    const pythonApiKey = process.env.PYTHON_AGENT_KEY;
    if (!pythonApiKey) throw new Error("PYTHON_AGENT_KEY environment variable is not configured.");
    
    try {
      await axios.post(`${AI_BASE_URL}/student/evaluate-async`, payload, {
        headers: {
          "X-API-Key": pythonApiKey,
          "Content-Type": "application/json"
        },
        timeout: 10000
      });

      return res.status(202).json({
        success: true,
        message: "AI evaluation queued successfully in the background.",
        status: "Evaluating"
      });

    } catch (aiError) {
      console.error("Failed to trigger async AI evaluation:", aiError.message);
      
      // Unlock submission and mark result as Failed
      submission.isLockedForEvaluation = false;
      await submission.save();

      resultDoc.status = "Failed";
      await resultDoc.save();

      return res.status(500).json({
        success: false,
        message: "Failed to queue evaluation on AI microservice: " + (aiError.response?.data?.detail || aiError.message)
      });
    }

  } catch (error) {
    const exactReason = error.message || "Unknown server error";
    console.error("Trigger Evaluation Error:", exactReason);

    // Fallback unlock and status setting
    try {
      if (studentId && examId) {
        await Answers.findOneAndUpdate(
          { uploaded_student: studentId, for_exam: examId },
          { $set: { isLockedForEvaluation: false } }
        );
        const rDoc = await Result.findOne({ student: studentId, exam: examId });
        if (rDoc) {
          rDoc.status = "Failed";
          await rDoc.save();
        }
      }
    } catch (saveErr) {
      console.error("Failed to reset error states:", saveErr);
    }

    return res.status(500).json({ success: false, message: `Server Error: ${exactReason}` });
  }
};

// ==========================================
// 2A. WEBHOOK CALLBACK FOR ASYNC EVALUATION
// ==========================================
export const evaluationWebhookCallback = async (req, res) => {
  try {
    const expectedKey = process.env.PYTHON_AGENT_KEY;

    if (!expectedKey) {
      return res.status(500).json({ success: false, message: "Server configuration error: PYTHON_AGENT_KEY is missing." });
    }

    const apiKey = req.get("X-API-Key") || req.headers["x-api-key"];
    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ success: false, message: "Unauthorized callback API Key" });
    }

    const { student_id, exam_id, results } = req.body;
    if (!student_id || !exam_id || !results) {
      return res.status(400).json({ success: false, message: "Missing required callback payload fields" });
    }

    // 1. Fetch Result document
    const resultDoc = await Result.findOne({ student: student_id, exam: exam_id });
    if (!resultDoc) {
      return res.status(404).json({ success: false, message: "Result document not found" });
    }

    // 2. Fetch the Exam & QuestionPaper to bound marks
    const exam = await Exam.findById(exam_id);
    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    const paper = await QuestionPaper.findById(exam.questionPaper);
    if (!paper) {
      return res.status(404).json({ success: false, message: "Question paper not found" });
    }

    // Map to quickly get maxMarks for each questionId
    const maxMarksMap = {};
    for (const section of paper.sections) {
      for (const q of section) {
        maxMarksMap[q.questionId] = q.marks;
        if (q.children && q.children.length > 0) {
          for (const sub of q.children) {
            maxMarksMap[sub.questionId] = sub.marks;
          }
        }
      }
    }

    let hasFailedQuestion = false;
    let hasUncertainQuestion = false;

    // 3. Process results
    for (const qRes of results) {
      const questionId = qRes.question_id;
      const maxMarks = maxMarksMap[questionId] || 10;

      let score = 0;
      let reasoning = "";
      let strengths = "";
      let weakness = "";
      let feedback = "";

      if (qRes.status === "success" && qRes.evaluation) {
        let aiOutput = qRes.evaluation;
        if (typeof aiOutput === 'string') {
          try {
            const cleanedText = aiOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
            aiOutput = JSON.parse(cleanedText);
          } catch (e) {
            // Treat as raw text if JSON parse fails
          }
        }

        if (typeof aiOutput === 'object' && aiOutput !== null && aiOutput.score !== undefined) {
          score = Number(aiOutput.score) || 0;
          if (score < 0) score = 0;
          if (score > maxMarks) score = maxMarks;
          reasoning = aiOutput.reasoning || "";
          strengths = aiOutput.strengths || "";
          weakness = aiOutput.weaknesses || "";
          feedback = aiOutput.feedback || "";

          const isUncertain = qRes.recheck_status === "Uncertain" || 
                              (qRes.recheck_status === "Revision Needed" && qRes.revision_count >= 3);
          if (isUncertain) {
            hasUncertainQuestion = true;
          }
        } else {
          reasoning = typeof aiOutput === 'string' ? aiOutput : "Evaluation failed format.";
          if (reasoning.startsWith("OCR_FAILED:")) {
            score = 0;
            hasFailedQuestion = true; // Flag as failed so faculty must manually grade
          } else {
            hasFailedQuestion = true;
          }
        }
      } else {
        hasFailedQuestion = true;
        reasoning = qRes.error || "AI evaluation failed.";
      }

      const retrievedContext = qRes.retrieved_context || [];
      const recheckLogs = qRes.recheck_logs || [];
      const evaluationConfidence = qRes.evaluation_confidence || "High";

      const existingEvalIndex = resultDoc.evaluations.findIndex(e => e.questionId === questionId);
      if (existingEvalIndex >= 0) {
        resultDoc.evaluations[existingEvalIndex].aiMarks = score;
        resultDoc.evaluations[existingEvalIndex].aiReasoning = reasoning;
        resultDoc.evaluations[existingEvalIndex].strengths = strengths;
        resultDoc.evaluations[existingEvalIndex].weakness = weakness;
        resultDoc.evaluations[existingEvalIndex].aiFeedback = feedback;
        resultDoc.evaluations[existingEvalIndex].retrievedContext = retrievedContext;
        resultDoc.evaluations[existingEvalIndex].recheckLogs = recheckLogs;
        resultDoc.evaluations[existingEvalIndex].evaluationConfidence = evaluationConfidence;
      } else {
        resultDoc.evaluations.push({
          questionId,
          aiMarks: score,
          aiReasoning: reasoning,
          strengths,
          weakness,
          aiFeedback: feedback,
          retrievedContext,
          recheckLogs,
          evaluationConfidence
        });
      }
    }

    let finalTotal = 0;
    for (const ev of resultDoc.evaluations) {
      finalTotal += (ev.overrideMarks !== null && ev.overrideMarks !== undefined) ? ev.overrideMarks : ev.aiMarks;
    }
    resultDoc.totalMarksObtained = finalTotal;

    if (hasFailedQuestion) {
      resultDoc.status = "Failed";
    } else if (hasUncertainQuestion) {
      resultDoc.status = "Uncertain";
    } else {
      resultDoc.status = "Completed";
    }

    await resultDoc.save();

    // Unlock Answers document
    await Answers.findOneAndUpdate(
      { uploaded_student: student_id, for_exam: exam_id },
      { $set: { isLockedForEvaluation: false } }
    );

    console.log(`[Webhook] Asynchronous evaluation finished for student ${student_id}. Status: ${resultDoc.status}. Total Marks: ${finalTotal}`);
    return res.status(200).json({ success: true, status: resultDoc.status, totalMarks: finalTotal });

  } catch (error) {
    console.error("[Webhook] Callback error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ==========================================
// 3. UPLOAD TEACHER MATERIALS (RUBRIC/NOTES/SYLLABUS/KEYS)
// ==========================================
export const uploadTeacherMaterials = async (req, res) => {
  let newMaterial = null;
  const { examId } = req.params;
  const { fileUrl, contentType, questionId, scope, replaceMaterialId, imageKitFileId, title } = req.body;
  const facultyId = req.user.id;

  try {
    if (!fileUrl || !contentType) {
      return res.status(400).json({ success: false, message: "File URL and Content Type are required." });
    }

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });

    if (exam.assignedFaculty.toString() !== facultyId) {
      return res.status(403).json({ success: false, message: "Unauthorized: Only assigned faculty can upload materials." });
    }

    let version = 1;
    let parentMaterialId = null;
    let oldMaterial = null;

    if (replaceMaterialId) {
      oldMaterial = await TeacherMaterial.findById(replaceMaterialId);
      if (!oldMaterial) {
        return res.status(404).json({ success: false, message: "Material to replace not found." });
      }
      if (oldMaterial.collegeId.toString() !== exam.collegeId.toString() || 
          oldMaterial.courseId.toString() !== exam.courseId.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized: Material boundaries mismatch." });
      }
      version = (oldMaterial.version || 1) + 1;
      parentMaterialId = oldMaterial.parentMaterialId || oldMaterial._id;
    }

    const namespace = exam.collegeId.toString();

    // Determine scope and question ID based on content type
    let finalScope = null;
    let finalQuestionId = null;

    if (contentType === "answer_key" || contentType === "rubric") {
      if (replaceMaterialId && oldMaterial) {
        finalScope = oldMaterial.scope || "entire_exam";
        finalQuestionId = oldMaterial.questionId || null;
      } else {
        finalScope = scope || "entire_exam";
        finalQuestionId = finalScope === "question" ? questionId : null;
      }
    }

    // Create MongoDB document with status "pending" and isActiveVersion false
    newMaterial = await TeacherMaterial.create({
      collegeId: exam.collegeId,
      courseId: exam.courseId,
      examId: (contentType === "notes" || contentType === "syllabus") ? null : examId,
      materialType: contentType,
      title: title || "Uploaded Material",
      imageKitUrl: fileUrl,
      imageKitFileId: imageKitFileId || "unknown",
      questionId: finalQuestionId,
      scope: finalScope,
      version,
      parentMaterialId,
      isActiveVersion: false,
      uploadedBy: facultyId,
      status: "pending"
    });

    console.log(`[AI] Sending ${contentType} to AI for vectorization...`);

    const payload = {
      raw_input: fileUrl,
      content_type: contentType,
      subject: exam.subjectName,
      exam_id: examId,
      namespace: namespace,
      material_id: newMaterial._id.toString(),
      course_id: exam.courseId.toString(),
      faculty_id: facultyId
    };

    if (contentType === "answer_key" || contentType === "rubric") {
      payload.question_id = finalScope === "question" ? finalQuestionId : "entire_exam";
    }

    const pythonApiKey = process.env.PYTHON_AGENT_KEY;
    if (!pythonApiKey) throw new Error("PYTHON_AGENT_KEY environment variable is not configured.");

    try {
      const aiResponse = await axios.post(`${AI_BASE_URL}/teacher/upload`, payload, {
        headers: {
          "X-API-Key": pythonApiKey
        }
      });
      const chunkCount = aiResponse.data.chunk_count || 0;
      console.log(`[AI] Vectorization Complete. Chunks count: ${chunkCount}`, aiResponse.data);

      // Successfully vectorized: activate the new material
      newMaterial.status = "active";
      newMaterial.isActiveVersion = true;
      newMaterial.chunkCount = chunkCount;
      await newMaterial.save();

      // Deactivate old version and delete its chunks in Pinecone
      if (oldMaterial) {
        oldMaterial.isActiveVersion = false;
        await oldMaterial.save();
        
        try {
          const deleteUrl = `${AI_BASE_URL}/teacher/materials/${oldMaterial._id}?namespace=${exam.collegeId.toString()}`;
          await axios.delete(deleteUrl, {
            headers: {
              "X-API-Key": pythonApiKey
            }
          });
          console.log(`[AI] Deleted chunks of replaced material ${oldMaterial._id} from Pinecone.`);
        } catch (delErr) {
          console.error(`[AI] Failed to delete chunks of replaced material ${oldMaterial._id}:`, delErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Materials successfully uploaded and vectorized by the AI.",
        material: newMaterial,
        ai_status: aiResponse.data
      });
    } catch (aiError) {
      console.error("AI Vectorization failed, cleaning up MongoDB document and ImageKit...", aiError.message);

      if (imageKitFileId && imageKitFileId !== "unknown") {
        try {
          await imagekit.deleteFile(imageKitFileId);
          console.log(`[ImageKit] Deleted file ${imageKitFileId} due to AI failure`);
        } catch (ikErr) {
          console.error("Failed to delete file from ImageKit during AI cleanup:", ikErr.message);
        }
      }

      if (newMaterial) {
        await TeacherMaterial.findByIdAndDelete(newMaterial._id);
      }
      throw aiError;
    }

  } catch (error) {
    console.error("Teacher Upload Error:", error);

    // Safety fallback cleanup
    if (newMaterial && !newMaterial.isActiveVersion) {
      try {
        const checkMat = await TeacherMaterial.findById(newMaterial._id);
        if (checkMat) {
          await TeacherMaterial.findByIdAndDelete(newMaterial._id);
        }
      } catch (dbErr) {
        console.error("Cleanup of Mongoose doc failed:", dbErr);
      }

      if (imageKitFileId && imageKitFileId !== "unknown") {
        try {
          await imagekit.deleteFile(imageKitFileId);
        } catch (ikErr) {
          console.error("Failed to delete file from ImageKit:", ikErr.message);
        }
      }
    }

    res.status(500).json({ success: false, message: "Server error during AI vectorization.", error: error.message });
  }
};

// ==========================================
// 3A. GET TEACHER MATERIALS
// ==========================================
export const getTeacherMaterials = async (req, res) => {
  try {
    const { examId } = req.params;
    const facultyId = req.user.id;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });

    if (exam.assignedFaculty.toString() !== facultyId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const materials = await TeacherMaterial.find({
      collegeId: exam.collegeId,
      status: "active",
      isActiveVersion: true,
      $or: [
        { courseId: exam.courseId, materialType: { $in: ["notes", "syllabus"] } },
        { examId: examId, materialType: { $in: ["answer_key", "rubric"] } }
      ]
    }).populate("uploadedBy", "name email");

    return res.status(200).json({
      success: true,
      materials
    });
  } catch (error) {
    console.error("Get Teacher Materials Error:", error);
    res.status(500).json({ success: false, message: "Server error during materials retrieval.", error: error.message });
  }
};

// ==========================================
// 3B. GET TEACHER MATERIAL HISTORY
// ==========================================
export const getMaterialHistory = async (req, res) => {
  try {
    const { examId, materialId } = req.params;
    const facultyId = req.user.id;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });

    if (exam.assignedFaculty.toString() !== facultyId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const material = await TeacherMaterial.findById(materialId);
    if (!material) return res.status(404).json({ success: false, message: "Material not found." });

    // Enforce boundaries
    if (material.collegeId.toString() !== exam.collegeId.toString() || material.courseId.toString() !== exam.courseId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized: Material boundaries mismatch." });
    }

    const rootId = material.parentMaterialId || material._id;

    const history = await TeacherMaterial.find({
      $or: [
        { _id: rootId },
        { parentMaterialId: rootId }
      ]
    })
    .sort({ version: -1 })
    .populate("uploadedBy", "name email");

    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    console.error("Get Material History Error:", error);
    res.status(500).json({ success: false, message: "Server error during history retrieval.", error: error.message });
  }
};

// ==========================================
// 3C. DELETE TEACHER MATERIAL
// ==========================================
export const deleteTeacherMaterial = async (req, res) => {
  try {
    const { examId, materialId } = req.params;
    const facultyId = req.user.id;

    const material = await TeacherMaterial.findById(materialId);
    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found." });
    }

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });
    if (exam.assignedFaculty.toString() !== facultyId) {
      return res.status(403).json({ success: false, message: "Unauthorized: Only assigned faculty can delete materials." });
    }

    // Enforce college and course multi-tenant boundaries
    if (material.collegeId.toString() !== exam.collegeId.toString() || material.courseId.toString() !== exam.courseId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized: Material boundaries mismatch." });
    }

    // Block if evaluation is in progress
    const activeEval = await Result.findOne({ exam: examId, status: "Evaluating" });
    if (activeEval) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete material while AI evaluation is in progress for this exam."
      });
    }

    // 1. Delete chunks from Pinecone FIRST
    try {
      const pythonApiKey = process.env.PYTHON_AGENT_KEY;
      if (!pythonApiKey) throw new Error("PYTHON_AGENT_KEY environment variable is not configured.");

      const deleteUrl = `${AI_BASE_URL}/teacher/materials/${materialId}?namespace=${exam.collegeId.toString()}`;
      const aiResponse = await axios.delete(deleteUrl, {
        headers: {
          "X-API-Key": pythonApiKey
        }
      });
      console.log(`[AI] Chunks deletion complete:`, aiResponse.data);
    } catch (aiErr) {
      console.error("Failed to delete chunks from Pinecone via AI microservice:", aiErr.message);
      // Abort deletion to prevent out-of-sync state
      return res.status(500).json({
        success: false,
        message: "Failed to delete vectors from Pinecone. Deletion aborted to maintain consistency.",
        error: aiErr.message
      });
    }

    // 2. Delete from ImageKit SECOND
    if (material.imageKitFileId && material.imageKitFileId !== "unknown") {
      try {
        await imagekit.deleteFile(material.imageKitFileId);
        console.log(`[ImageKit] Deleted file ${material.imageKitFileId}`);
      } catch (ikErr) {
        console.error("Failed to delete file from ImageKit:", ikErr.message);
      }
    }

    // 3. Delete from MongoDB LAST
    await TeacherMaterial.findByIdAndDelete(materialId);

    return res.status(200).json({
      success: true,
      message: "Material deleted successfully from vectors, storage, and database."
    });

  } catch (error) {
    console.error("Delete Teacher Material Error:", error);
    res.status(500).json({ success: false, message: "Server error during material deletion.", error: error.message });
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

    const paper = await QuestionPaper.findById(exam.questionPaper);
    if (!paper) return res.status(404).json({ success: false, message: "Question paper not found." });

    let maxMarks = null;
    for (const section of paper.sections) {
      for (const q of section) {
        if (q.questionId === questionId) {
          maxMarks = q.marks;
          break;
        }
        if (q.children && q.children.length > 0) {
          const foundSub = q.children.find(sub => sub.questionId === questionId);
          if (foundSub) {
            maxMarks = foundSub.marks;
            break;
          }
        }
      }
      if (maxMarks !== null) break;
    }

    if (maxMarks === null) {
      return res.status(400).json({ success: false, message: "Question ID not found in the question paper." });
    }

    if (overrideMarks < 0 || overrideMarks > maxMarks) {
      return res.status(400).json({ success: false, message: `Override marks must be between 0 and ${maxMarks}.` });
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


// ==========================================
// 5. FACULTY: PUBLISH / UNPUBLISH EXAM RESULTS
// ==========================================
export const publishExamResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const { publish } = req.body; // boolean
    const facultyId = req.user.id;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found." });
    }

    if (exam.assignedFaculty.toString() !== facultyId) {
      return res.status(403).json({ success: false, message: "Unauthorized to publish results for this exam." });
    }

    exam.resultsPublished = publish === true;
    await exam.save();

    res.status(200).json({
      success: true,
      message: `Results ${exam.resultsPublished ? 'published successfully' : 'unpublished successfully'}.`,
      resultsPublished: exam.resultsPublished
    });
  } catch (error) {
    console.error("Error publishing results:", error);
    res.status(500).json({ success: false, message: "Server error during results publication." });
  }
};
