import Upload from "../../models/uploadSession.js";
import Answers from "../../models/answer.js";
import Student from "../../models/student.js";
import Exam from "../../models/exam.js";
import imagekit from "../../configurations/imageKit.js";

const getFolderStructure = async (studentId, examId) => {
  let collegeFolder = "unknown_college";
  let examFolder = examId;
  let studentFolder = studentId;

  try {
    const student = await Student.findById(studentId).populate("collegeId");
    if (student) {
      if (student.collegeId) {
        collegeFolder = student.collegeId.collegeCode
          ? student.collegeId.collegeCode.toUpperCase().replace(/[^a-zA-Z0-9-_]/g, "_")
          : student.collegeId.collegeName.replace(/[^a-zA-Z0-9-_]/g, "_");
      }
      if (student.rollNumber) {
        studentFolder = student.rollNumber.replace(/[^a-zA-Z0-9-_]/g, "_");
      }
    }
  } catch (err) {
    console.error("Error fetching student/college info for folder naming:", err);
  }

  try {
    const exam = await Exam.findById(examId);
    if (exam) {
      const examTypeShortMap = {
        "Mid Semester Examination": "MIDSEM",
        "End Semester Examination": "ENDSEM",
        "Special Mid Semester Examination": "SPL-MIDSEM",
        "Special End Semester Examination": "SPL-ENDSEM"
      };
      const shortType = examTypeShortMap[exam.examType] || "EXAM";
      const year = exam.date ? new Date(exam.date).getFullYear() : new Date().getFullYear();
      examFolder = `${exam.subjectCode}-${shortType}-${year}`.toUpperCase().replace(/[^a-zA-Z0-9-_]/g, "_");
    }
  } catch (err) {
    console.error("Error fetching exam info for folder naming:", err);
  }

  return `/AISSAES/${collegeFolder}/${examFolder}/${studentFolder}`;
};

export const UploadAnswer = async (req, res) => {
  try {
    const { token, questionNo } = req.body;
    const file = req.file;

    if (!file || !token || !questionNo) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: "Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed." });
    }

    // 1. Find session with populated student and exam
    const session = await Upload.findOne({ token, student: req.user.id })
      .populate("student")
      .populate("exam");

    if (!session) {
      return res.status(404).json({ error: "Invalid session" });
    }

    if (!session.student || !session.exam) {
      return res.status(400).json({ error: "Invalid session references" });
    }

    // Tenant Check: College isolation
    if (session.student.collegeId.toString() !== session.exam.collegeId.toString()) {
      return res.status(403).json({ error: "Access denied. College ID mismatch." });
    }

    // 2. Check expiry and exam deadline
    if (Date.now() > session.expiresAt.getTime()) {
      return res.status(403).json({ error: "Time over" });
    }

    if (Date.now() > session.exam.endTime.getTime()) {
      return res.status(403).json({ error: "Exam time has ended. Submissions are closed." });
    }

    // 3. Check if answers are locked for evaluation or already submitted
    const answersDoc = await Answers.findOne({ uploaded_student: session.student._id, for_exam: session.exam._id });
    if (answersDoc && answersDoc.isSubmitted) {
      return res.status(403).json({ success: false, isAlreadySubmitted: true, message: "You have already submitted this examination. Re-attempts are strictly prohibited." });
    }
    if (answersDoc && answersDoc.isLockedForEvaluation) {
      return res.status(400).json({ error: "This exam submission is locked because evaluation is in progress or completed." });
    }

    // 4. Upload to ImageKit
    const mimeType = file.mimetype || "application/octet-stream";
    const ext = mimeType === "application/pdf" ? "pdf" : (file.originalname ? file.originalname.split('.').pop() : "jpg");
    const fileNameWithExt = `${session.student._id}_${session.exam._id}_q${questionNo}.${ext}`;

    const folderPath = await getFolderStructure(session.student._id, session.exam._id);

    const uploadResponse = await imagekit.upload({
      file: file.buffer, // important (memoryStorage)
      fileName: fileNameWithExt,
      folder: folderPath,
    });

    const fileUrl = uploadResponse.url;
    const fileType = mimeType === "application/pdf" ? "pdf" : (mimeType.startsWith("image/") ? "image" : "unknown");
    const originalFileName = file.originalname || "submission";
    const size = file.size || 0;
    const uploadedAt = new Date();

    const answerMetadata = {
      fileUrl,
      fileType,
      mimeType,
      originalFileName,
      size,
      uploadedAt,
      imageKitFileId: uploadResponse.fileId
    };

    // 5. Atomic Find/Upsert to avoid race conditions
    const updatePath = `answers.${questionNo}`;
    await Answers.findOneAndUpdate(
      { uploaded_student: session.student._id, for_exam: session.exam._id },
      { $set: { [updatePath]: answerMetadata } },
      { upsert: true, new: true }
    );

    res.json({ success: true, fileUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

//Reupload or change answer sheet
export const reuploadAnswer = async (req, res) => {
  try {
    const { token, questionNo } = req.body;
    const file = req.file;

    if (!file || !token || !questionNo) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed."
      });
    }

    // Find session with populated student and exam
    const session = await Upload.findOne({ token, student: req.user.id })
      .populate("student")
      .populate("exam");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Invalid session",
      });
    }

    if (!session.student || !session.exam) {
      return res.status(400).json({
        success: false,
        message: "Invalid session references",
      });
    }

    // Tenant Check: College isolation
    if (session.student.collegeId.toString() !== session.exam.collegeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. College ID mismatch.",
      });
    }

    // Check expiry and exam deadline
    if (Date.now() > session.expiresAt.getTime()) {
      return res.status(403).json({
        success: false,
        message: "Time over"
      });
    }

    if (Date.now() > session.exam.endTime.getTime()) {
      return res.status(403).json({
        success: false,
        message: "Exam time has ended. Submissions are closed."
      });
    }

    const doc = await Answers.findOne({
      uploaded_student: session.student._id,
      for_exam: session.exam._id,
    });

    if (doc && doc.isSubmitted) {
      return res.status(403).json({
        success: false,
        isAlreadySubmitted: true,
        message: "You have already submitted this examination. Re-attempts are strictly prohibited."
      });
    }

    if (doc && doc.isLockedForEvaluation) {
      return res.status(400).json({
        success: false,
        message: "This exam submission is locked because evaluation is in progress or completed."
      });
    }

    if (!doc || !doc.answers || !doc.answers.has(String(questionNo))) {
      return res.status(400).json({
        success: false,
        message: "No existing answer to replace",
      });
    }

    // Retrieve the old file ID for cleanup
    const oldAnswer = doc.answers.get(String(questionNo));
    const oldFileId = oldAnswer ? oldAnswer.imageKitFileId : null;

    // Upload new file
    const mimeType = file.mimetype || "application/octet-stream";
    const ext = mimeType === "application/pdf" ? "pdf" : (file.originalname ? file.originalname.split('.').pop() : "jpg");
    const fileNameWithExt = `${session.student._id}_${session.exam._id}_q${questionNo}.${ext}`;

    const folderPath = await getFolderStructure(session.student._id, session.exam._id);

    const uploadResponse = await imagekit.upload({
      file: file.buffer,
      fileName: fileNameWithExt,
      folder: folderPath,
    });

    const fileUrl = uploadResponse.url;
    const fileType = mimeType === "application/pdf" ? "pdf" : (mimeType.startsWith("image/") ? "image" : "unknown");
    const originalFileName = file.originalname || "submission";
    const size = file.size || 0;
    const uploadedAt = new Date();

    const answerMetadata = {
      fileUrl,
      fileType,
      mimeType,
      originalFileName,
      size,
      uploadedAt,
      imageKitFileId: uploadResponse.fileId
    };

    // Delete the old file from ImageKit to prevent orphans
    if (oldFileId) {
      try {
        await imagekit.deleteFile(oldFileId);
        console.log(`️ Successfully deleted old answer file ${oldFileId} from ImageKit`);
      } catch (deleteError) {
        console.error("Failed to delete old file from ImageKit during reupload:", deleteError.message);
      }
    }

    // overwrite atomically
    const updatePath = `answers.${questionNo}`;
    await Answers.findOneAndUpdate(
      { uploaded_student: session.student._id, for_exam: session.exam._id },
      { $set: { [updatePath]: answerMetadata } }
    );

    return res.status(200).json({
      success: true,
      message: "Answer updated",
      fileUrl,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const finalizeSubmission = async (req, res) => {
  try {
    const { token } = req.body;
    const studentId = req.user.id;

    // Find the active session
    const session = await Upload.findOne({ token: token, student: studentId }).populate("exam");

    if (!session) {
      // Check if already submitted (no-reattempt enforcement)
      return res.status(400).json({ success: false, message: "No active upload session found. It may have already expired or been submitted." });
    }

    // Guard: Reject finalization if no answers have been uploaded yet
    const answersDoc = await Answers.findOne({ uploaded_student: studentId, for_exam: session.exam._id });
    if (!answersDoc || !answersDoc.answers || [...answersDoc.answers.keys()].length === 0) {
      return res.status(400).json({ success: false, message: "Cannot finalize submission: no answer pages have been uploaded yet." });
    }

    // Guard: Block double-finalization
    if (answersDoc.isSubmitted) {
      return res.status(403).json({ success: false, isAlreadySubmitted: true, message: "You have already submitted this examination. Re-attempts are strictly prohibited." });
    }

    // Mark submission as finalized using authoritative server time
    await Answers.findOneAndUpdate(
      { uploaded_student: studentId, for_exam: session.exam._id },
      { $set: { isSubmitted: true, submittedAt: new Date() } }
    );

    // Delete the active upload session
    await Upload.findOneAndDelete({ token: token, student: studentId });

    res.status(200).json({ success: true, submissionFinalized: true, message: "Exam submitted successfully! Upload window is now closed." });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const getActiveExamSession = async (req, res) => {
  try {
    const { examId } = req.query;
    const studentId = req.user.id;

    if (!examId) {
      return res.status(400).json({ success: false, message: "examId query parameter is required" });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    // Check if the student has already submitted answers for this exam
    const answersDoc = await Answers.findOne({ uploaded_student: studentId, for_exam: examId });
    if (answersDoc && answersDoc.isSubmitted) {
      return res.json({ success: true, state: "SUBMITTED" });
    }

    const now = Date.now();
    const startTime = exam.startTime.getTime();
    const endTime = exam.endTime.getTime();

    // 5-minute pre-exam buffer window
    const bufferStartTime = startTime - 5 * 60 * 1000;

    if (now >= bufferStartTime && now < startTime) {
      return res.json({ success: true, state: "BUFFER", exam });
    } else if (now >= startTime && now <= endTime) {
      return res.json({ success: true, state: "ACTIVE", exam });
    } else if (now > endTime) {
      return res.json({ success: true, state: "CLOSED" });
    } else {
      return res.json({ success: true, state: "SCHEDULED" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
