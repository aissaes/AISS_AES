// controllers/evaluationController.js
import { genAI, pineconeIndex } from "../configurations/aiConfig.js";
import Answers from "../models/answer.js"; 
import QuestionPaper from "../models/questionPapers.js";
import Result from "../models/result.js";
import axios from "axios";

// Helper function to download ImageKit URL so Gemini can "see" it
const fetchImageAsGenerativePart = async (imageUrl) => {
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  return {
    inlineData: {
      data: Buffer.from(response.data).toString("base64"),
      mimeType: response.headers["content-type"] || "image/jpeg"
    },
  };
};

// Helper function to find the exact marks for a specific question
const findQuestionMarks = (sections, targetQuestionId) => {
  for (const section of sections) {
    for (const question of section) {
      if (question.questionId === targetQuestionId) return question.marks;
      if (question.children && question.children.length > 0) {
        for (const child of question.children) {
          if (child.questionId === targetQuestionId) return child.marks;
        }
      }
    }
  }
  return null; 
};

export const evaluateStudentExam = async (req, res) => {
  try {
    const { examId, studentId } = req.params;

    const studentSubmission = await Answers.findOne({ for_exam: examId, uploaded_student: studentId });
    if (!studentSubmission || !studentSubmission.answers) {
      return res.status(404).json({ success: false, message: "No submission found for this student." });
    }

    const paper = await QuestionPaper.findOne({ examId: examId });
    if (!paper) {
      return res.status(404).json({ success: false, message: "Question paper not found." });
    }

    res.status(202).json({
      success: true,
      message: "Evaluation started in background... You may safely navigate away."
    });

    (async () => {
      try {
        const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" }); 

    let totalMarksObtained = 0;
    let totalMaxMarks = 0;
    const evaluationDetails = [];

    for (const [questionId, imageUrl] of studentSubmission.answers.entries()) {
      console.log(`\n--- Evaluating Question ${questionId} ---`);

      // PHASE A: OCR 
      console.log("📝 Running OCR on student answer sheet...");
      const imagePart = await fetchImageAsGenerativePart(imageUrl);
      const ocrPrompt = "Extract all handwritten text, math, and formulas from this image. Output only the raw text.";
      const ocrResult = await visionModel.generateContent([ocrPrompt, imagePart]);
      const studentText = ocrResult.response.text();

      // PHASE B: RAG RETRIEVAL 
      console.log("🔍 Searching Vector DB for Master Answer Key...");
      const vectorRes = await embeddingModel.embedContent(studentText);
      const studentVector = vectorRes.embedding.values;

      const pineconeQuery = await pineconeIndex.query({
        vector: studentVector,
        topK: 5, 
        includeMetadata: true,
        filter: { examId: String(examId) } 
      });

      if (pineconeQuery.matches && pineconeQuery.matches.length > 0) {
        console.log(`✅ Found ${pineconeQuery.matches.length} relevant paragraphs in Vector DB.`);
      } else {
        console.log(`⚠️ WARNING: No reference notes found in Vector DB for this exam!`);
      }

      const referenceNotes = pineconeQuery.matches.map(match => match.metadata.text).join("\n\n");

      // PHASE C: THE AI GRADER 
      console.log("🤖 Grading answer against reference notes...");
      
      let maxMarks = findQuestionMarks(paper.sections, questionId);
      if (!maxMarks) {
        console.log(`⚠️ Warning: Could not find marks for ${questionId}. Defaulting to 10.`);
        maxMarks = 10; 
      }
      totalMaxMarks += maxMarks;

      const gradingPrompt = `
        You are a strict grading professor.
        Official Textbook Reference: "${referenceNotes}"
        Student's Answer: "${studentText}"
        
        Grade the student's answer based strictly on the reference. Max marks: ${maxMarks}.
        Return ONLY a raw JSON object with this exact structure (do not use markdown formatting or backticks):
        {
          "marksAwarded": 8,
          "feedback": "Explain the deduction here."
        }
      `;

      const gradingResult = await visionModel.generateContent(gradingPrompt);
      
      const rawJsonString = gradingResult.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      const finalGrade = JSON.parse(rawJsonString);

      totalMarksObtained += finalGrade.marksAwarded;
      console.log(`🎯 Grade Assigned: ${finalGrade.marksAwarded}/${maxMarks}`);

      evaluationDetails.push({
        questionId,
        studentAnswerText: studentText,
        aiMarks: finalGrade.marksAwarded,
        maxMarks: maxMarks,
        aiFeedback: finalGrade.feedback,
        retrievedReference: referenceNotes
      });
    }

    // 4. FIX: Save the examId and the breakdown array to the Result schema
    const newResult = await Result.create({
      student: studentId,
      questionPaper: paper._id,
      examId: examId,
      marksObtained: totalMarksObtained,
      totalMarks: totalMaxMarks,
      breakdown: evaluationDetails
    });

    console.log(`✅ AI Evaluation Complete for student ${studentId}. Score: ${totalMarksObtained}/${totalMaxMarks}`);

      } catch (backgroundError) {
        console.error("Detached AI Evaluation Crash:", backgroundError);
      }
    })();

  } catch (error) {
    console.error("AI Evaluation Setup Crash:", error);
    res.status(500).json({ success: false, message: "Server error during evaluation setup.", error: error.message });
  }
};


export const evaluateAllStudentsForExam = async (req, res) => {
  try {
    const { examId } = req.params;

    const allSubmissions = await Answers.find({ for_exam: examId });
    if (!allSubmissions || allSubmissions.length === 0) {
      return res.status(404).json({ success: false, message: "No student submissions found for this exam." });
    }

    const paper = await QuestionPaper.findOne({ examId: examId });
    if (!paper) {
      return res.status(404).json({ success: false, message: "Question paper not found." });
    }

    res.status(202).json({
      success: true,
      message: `Batch evaluation initiated in background for ${allSubmissions.length} students. You may navigate away.`
    });

    (async () => {
      try {
        const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" }); 

    const bulkResults = [];

    for (const submission of allSubmissions) {
      const studentId = submission.uploaded_student;
      console.log(`\n======================================`);
      console.log(`Evaluating Student: ${studentId}...`);
      console.log(`======================================`);

      let totalMarksObtained = 0;
      let totalMaxMarks = 0;
      const evaluationDetails = []; // FIX: Added tracking array

      if (submission.answers) {
        for (const [questionId, imageUrl] of submission.answers.entries()) {
          console.log(`\n--- Question ${questionId} ---`);
          
          console.log("📝 Running OCR...");
          const imagePart = await fetchImageAsGenerativePart(imageUrl);
          const ocrPrompt = "Extract all handwritten text, math, and formulas. Output only raw text.";
          const ocrResult = await visionModel.generateContent([ocrPrompt, imagePart]);
          const studentText = ocrResult.response.text();

          console.log("🔍 Searching Vector DB...");
          const vectorRes = await embeddingModel.embedContent(studentText);
          const pineconeQuery = await pineconeIndex.query({
            vector: vectorRes.embedding.values,
            topK: 5,
            includeMetadata: true,
            filter: { examId: String(examId) }
          });

          if (pineconeQuery.matches && pineconeQuery.matches.length > 0) {
            console.log(`✅ Found ${pineconeQuery.matches.length} matching references.`);
          } else {
            console.log(`⚠️ No references found in Vector DB.`);
          }

          const referenceNotes = pineconeQuery.matches.map(m => m.metadata.text).join("\n\n");

          console.log("🤖 Grading...");
          
          let maxMarks = findQuestionMarks(paper.sections, questionId);
          if (!maxMarks) maxMarks = 10; 
          totalMaxMarks += maxMarks;

          const gradingPrompt = `
            You are a strict grading professor.
            Textbook Reference: "${referenceNotes}"
            Student's Answer: "${studentText}"
            
            Grade the answer. Max marks: ${maxMarks}.
            Return ONLY a raw JSON object: { "marksAwarded": 8, "feedback": "..." }
          `;

          const gradingResult = await visionModel.generateContent(gradingPrompt);
          const rawJsonString = gradingResult.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
          const finalGrade = JSON.parse(rawJsonString);

          totalMarksObtained += finalGrade.marksAwarded;
          console.log(`🎯 Grade Assigned: ${finalGrade.marksAwarded}/${maxMarks}`);

          // FIX: Push to array
          evaluationDetails.push({
            questionId,
            studentAnswerText: studentText,
            aiMarks: finalGrade.marksAwarded,
            maxMarks: maxMarks,
            aiFeedback: finalGrade.feedback,
            retrievedReference: referenceNotes
          });
        }
      }

      // FIX: Save examId and breakdown
      const newResult = await Result.create({
        student: studentId,
        questionPaper: paper._id,
        examId: examId,
        marksObtained: totalMarksObtained,
        totalMarks: totalMaxMarks,
        breakdown: evaluationDetails 
      });

      bulkResults.push({
        studentId: studentId,
        marksObtained: totalMarksObtained,
        totalMaxMarks: totalMaxMarks,
        resultId: newResult._id
      });
    }

    console.log(`✅ Batch evaluation completed for ${allSubmissions.length} students.`);

      } catch (backgroundError) {
        console.error("Detached Bulk Evaluation Crash:", backgroundError);
      }
    })();

  } catch (error) {
    console.error("Bulk Evaluation Setup Crash:", error);
    res.status(500).json({ success: false, message: "Server error during bulk evaluation setup.", error: error.message });
  }
};