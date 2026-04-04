import Answers from "../models/answer.js";
import Exam from "../models/exam.js"
import { genAI, pineconeIndex } from "../configurations/aiConfig.js";
import crypto from "crypto";
import Result from "../models/result.js";

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

// 1. Get the list of all graded students for a specific exam
export const getExamResultsList = async (req, res) => {
  try {
    const { examId } = req.params;

    // 1. Fetch Exam
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found." });

    // 2. CRASH-PROOF SECURITY CHECK
    // This prevents the `.toString()` crash if the exam has no assigned faculty in the DB.
    // I also added a check so HODs can view the results too!
    const isAssigned = exam.assignedFaculty && exam.assignedFaculty.toString() === req.user.id;
    const isHOD = req.user.role === "hod" || req.user.role === "HOD";

    if (!isAssigned && !isHOD) {
      return res.status(403).json({ success: false, message: "Unauthorized. You are not the assigned faculty for this exam." });
    }

    // 3. Fetch Results
    const results = await Result.find({ examId: examId })
      .populate("student", "name rollNumber email")
      .select("student marksObtained totalMarks isManuallyEvaluated date");

    res.status(200).json({ success: true, count: results.length, results });

  } catch (error) {
    console.error("🔥 CRASH IN getExamResultsList:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 2. View a specific student's detailed answer sheet + AI Grade
export const getDetailedAnswerSheet = async (req, res) => {
  try {
    const { examId, studentId } = req.params;

    // Fetch the result document (with the AI breakdown)
    const result = await Result.findOne({ examId, student: studentId }).populate("student", "name rollNumber");
    if (!result) return res.status(404).json({ success: false, message: "Result not found." });

    // Fetch the raw images from ImageKit
    const answerImages = await Answers.findOne({ for_exam: examId, uploaded_student: studentId });

    res.status(200).json({
      success: true,
      studentInfo: result.student,
      overallScore: {
        obtained: result.marksObtained,
        total: result.totalMarks,
        isManuallyEvaluated: result.isManuallyEvaluated,
        overallFeedback: result.facultyFeedback
      },
      // We merge the AI feedback with the actual Image URL so the frontend can display them side-by-side!
      breakdown: result.breakdown.map((item) => ({
        ...item.toObject(),
        imageUrl: answerImages && answerImages.answers ? answerImages.answers.get(item.questionId) : null
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 3. Faculty manually overrides a specific question's marks
export const overrideQuestionMarks = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { questionId, newMarks, newFeedback } = req.body;

    const result = await Result.findById(resultId);
    if (!result) return res.status(404).json({ success: false, message: "Result not found." });

    // Find the specific question in the breakdown array
    const questionIndex = result.breakdown.findIndex(q => q.questionId === questionId);
    if (questionIndex === -1) return res.status(404).json({ success: false, message: "Question not found in result breakdown." });

    // Update the marks for that specific question
    result.breakdown[questionIndex].facultyMarks = newMarks;
    
    //Save the faculty's specific message to this exact question!
    if (newFeedback) {
        result.breakdown[questionIndex].facultyFeedback = newFeedback; 
    }

    // Recalculate the entire total score based on the new overrides
    let newTotalObtained = 0;
    for (const q of result.breakdown) {
      // If faculty overrode it, use faculty marks. Otherwise, keep the AI marks.
      newTotalObtained += (q.facultyMarks !== null) ? q.facultyMarks : q.aiMarks;
    }

    result.marksObtained = newTotalObtained;
    result.isManuallyEvaluated = true;
    if (newFeedback) result.facultyFeedback = newFeedback;

    await result.save();

    res.status(200).json({ success: true, message: "Marks successfully overridden.", updatedResult: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

//For HOD only
export const generateToken = async (req, res) => {
  try {
    const { examId } = req.params;

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: "Exam ID is required",
      });
    }

    // 1. Find exam
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "No such exam found",
      });
    }

    const hod = await Faculty.findById(req.user.id);
    // 2. SECURITY CHECK: Does this HOD own this exam?
    if (exam.collegeId.toString() !== hod.collegeId.toString() || exam.department !== hod.department) {
      return res.status(403).json({ success: false, message: "Unauthorized: You do not have permission to manage this exam." });
    }

    // 2. Generate token
    const token = generateSessionToken();

    // 3. Save token in exam
    exam.token = token;

    await exam.save();

    // 4. Send response
    return res.status(200).json({
      success: true,
      message: "Token generated successfully"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const generateQRCode = async (req, res) => {
  try {
    const { examId } = req.params;

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: "Exam ID is required",
      });
    }

    // 1. Find exam
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "No such exam found",
      });
    }
    
    const hod = await Faculty.findById(req.user.id);
    // 2. SECURITY CHECK: Does this HOD own this exam?
    if (exam.collegeId.toString() !== hod.collegeId.toString() || exam.department !== hod.department) {
      return res.status(403).json({ success: false, message: "Unauthorized: You do not have permission to manage this exam." });
    }
    
    if (!exam.token) {
      return res.status(400).json({ success: false, message: "You must generate a token before creating a QR code." });
    }

    // 3. Generate QR (FIXED LINE: await, generateQR, exam.token)
    const qrUrl = await generateQR(exam.token);

    // 4. Save url in exam
    exam.qrCode = qrUrl;
    await exam.save();

    // 5. Send response
    return res.status(200).json({
      success: true,
      message: "QR generated successfully",
      qrCode: qrUrl // Optional: send the URL back so the frontend can display it!
    });
  } catch(err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// ==========================================
// PART 1: ONLY READ THE PDF (OCR)
// ==========================================
export const extractTextFromPDF = async (req, res) => {
  try {
    const file = req.file; 
    if (!file) return res.status(400).json({ success: false, message: "PDF file is required." });

    console.log("Starting AI OCR Reading...");
    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const pdfPart = {
      inlineData: {
        data: file.buffer.toString("base64"),
        mimeType: "application/pdf"
      }
    };

    const prompt = "Extract all text from this document. Output only raw text.";
    const pdfResult = await visionModel.generateContent([prompt, pdfPart]);
    const rawText = pdfResult.response.text();

    console.log("OCR Complete!");
    res.status(200).json({
      success: true,
      message: "Successfully extracted text from PDF.",
      extractedText: rawText // We send the text back to Postman
    });

  } catch (error) {
    console.error("OCR Error:", error);
    res.status(500).json({ success: false, message: "Failed to read PDF.", error: error.message });
  }
};


export const uploadTextToVectorDB = async (req, res) => {
  try {
    const { examId } = req.params;
    const { text } = req.body; 

    if (!text || !examId) {
      return res.status(400).json({ success: false, message: "Text and examId are required." });
    }

    console.log("Starting Stable Vector Upload...");
    // 1. Merge broken PDF lines into clean, continuous text
    const cleanedText = text.replace(/(?<!\n)\n(?!\n)/g, " ");
    
    // 2. Split ONLY when there are double line breaks (true paragraphs)
    const chunks = cleanedText.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 50);
    
    if (chunks.length === 0) {
      return res.status(400).json({ success: false, message: "Text is too short." });
    }

    // The official model that works perfectly with your API key
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    let currentBatch = [];
    let totalUpserted = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim();
      
      const result = await embeddingModel.embedContent(chunk);
      
      // Convert to pure JavaScript numbers
      const pureNumberArray = Array.from(result.embedding.values).map(Number);

      // Generates a random 8-character string for every upload
      const uploadId = crypto.randomBytes(4).toString("hex"); 

      currentBatch.push({
        id: String(`${examId}-upload-${uploadId}-chunk-${i}`),
        values: pureNumberArray, 
        metadata: { 
          examId: String(examId), 
          text: String(chunk) 
        }
      });

      // Upload every 20 paragraphs to save memory
      if (currentBatch.length === 20) {
        console.log(`Sending batch of 20 to Pinecone...`);
        // We use Array.from again here just as a final shield against the Node 22 bug
        await pineconeIndex.upsert(Array.from(currentBatch)); 
        totalUpserted += currentBatch.length;
        console.log(`✅ Saved ${totalUpserted} paragraphs...`);
        currentBatch = []; 
      }

      // 1-second delay to bypass Google Rate Limits
      await delay(1000); 
    }

    // Save the remaining records
    if (currentBatch.length > 0) {
      console.log(`Sending final ${currentBatch.length} records to Pinecone...`);
      await pineconeIndex.upsert(Array.from(currentBatch));
      totalUpserted += currentBatch.length;
    }

    console.log(`🎉 ALL DONE! Total ${totalUpserted} paragraphs saved successfully.`);

    res.status(200).json({
      success: true,
      message: `${totalUpserted} paragraphs successfully uploaded to Vector Database.`,
    });

  } catch (error) {
    console.error("Vector Upload Error:", error);
    res.status(500).json({ success: false, message: "Failed to upload to Pinecone.", error: error.message });
  }
};