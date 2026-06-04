

import Upload from "../models/uploadSession.js";
import Answers from "../models/answer.js";

//upload answer sheet
import imagekit from "../configurations/imageKit.js";



export const UploadAnswer = async (req, res) => {
  try {
    const { token, questionNo } = req.body;

    // multer file
    const file = req.file;

    if (!file || !token || !questionNo) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 1. Find session
    const session = await Upload.findOne({ token, student: req.user.id });

    if (!session) {
      return res.status(404).json({ error: "Invalid session" });
    }

    // 2. Check expiry
    if (Date.now() > session.expiresAt.getTime()) {
      return res.status(403).json({ error: "Time over" });
    }

    // 3. Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: file.buffer, // important (memoryStorage)
      fileName: `${session.student}_${session.exam}_q${questionNo}`,
      folder: `/answers/${session.exam}/${session.student}`,
    });

    const fileUrl = uploadResponse.url;

    // 4. Atomic Find/Upsert to avoid race conditions
    const updatePath = `answers.${questionNo}`;
    await Answers.findOneAndUpdate(
      { uploaded_student: session.student, for_exam: session.exam },
      { $set: { [updatePath]: fileUrl } },
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

    const session = await Upload.findOne({ token, student: req.user.id });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Invalid session",
      });
    }

    if (Date.now() > session.expiresAt.getTime()) {
      return res.status(403).json({ error: "Time over" });
    }

    const doc = await Answers.findOne({
      uploaded_student: session.student,
      for_exam: session.exam,
    });

    if (!doc || !doc.answers || !doc.answers.has(String(questionNo))) {
      return res.status(400).json({
        success: false,
        message: "No existing answer to replace",
      });
    }

    // Upload new file
    const uploadResponse = await imagekit.upload({
      file: file.buffer,
      fileName: `${session.student}_${session.exam}_q${questionNo}`,
      folder: `/answers/${session.exam}/${session.student}`,
    });

    const fileUrl = uploadResponse.url;

    // overwrite atomically
    const updatePath = `answers.${questionNo}`;
    await Answers.findOneAndUpdate(
      { uploaded_student: session.student, for_exam: session.exam },
      { $set: { [updatePath]: fileUrl } }
    );

    return res.status(200).json({
      success: true,
      message: "Answer updated",
      fileUrl,
    });

  } catch (err) {
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

    // Find and delete the active session
    const deletedSession = await Upload.findOneAndDelete({ 
      token: token, 
      student: studentId 
    });

    if (!deletedSession) {
      return res.status(400).json({ success: false, message: "No active upload session found. It may have already expired or been submitted." });
    }

    res.status(200).json({ success: true, message: "Exam submitted successfully! Upload window is now closed." });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};