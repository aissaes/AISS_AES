import QuestionPaper from "../models/questionPapers.js";
import Exam from "../models/exam.js";
import Faculty from "../models/faculty.js";
import sendEmail from "../configurations/nodemailer.js";

// 1. TEACHER: Upload the Question Paper
export const uploadQuestionPaper = async (req, res) => {
  try {
    console.log("📥 Incoming Frontend Data:", JSON.stringify(req.body, null, 2));

    // Explicitly pull examId out of req.body so we can use it
    const { subjectCode, examId, sections, ...otherData } = req.body;

    if (!examId) {
      return res.status(400).json({ success: false, message: "examId is missing from the request." });
    }

    // 1. Protect against missing sections
    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({ success: false, message: "Sections data is missing or invalid." });
    }

    // 🚨 BUG FIX 1: PREVENT DUPLICATES
    const existingPaper = await QuestionPaper.findOne({ examId: examId });
    if (existingPaper) {
      return res.status(400).json({ 
        success: false, 
        message: "A question paper has already been submitted for this exam." 
      });
    }

    // 2. Auto-fill the missing questionIds
    const formattedSections = sections.map((section, sectionIndex) => {
      return section.map((question, questionIndex) => {
        return {
          ...question,
          questionId: question.questionId || `S${sectionIndex + 1}-Q${questionIndex + 1}`
        };
      });
    });

    // 3. Fetch the logged-in faculty member to get their college and department
    const faculty = await Faculty.findById(req.user.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: "Faculty profile not found." });
    }

    // 4. Save to database
    const newPaper = await QuestionPaper.create({
      subjectCode,
      examId,                       // 👈 Ensure examId is saved to the paper
      collegeId: faculty.collegeId, 
      createdBy: req.user.id,       
      sections: formattedSections,
      ...otherData 
    });

    // We MUST tell the Exam document that this paper now exists!
    const updatedExam = await Exam.findByIdAndUpdate(
      examId, 
      { questionPaper: newPaper._id, isPaperQuestionUploaded: true },
      { new: true } // Returns the updated document so we can use its name in the email
    );

    // 5. EMAIL NOTIFICATION: Alert the HOD that a paper is ready for review
    const hod = await Faculty.findOne({
      collegeId: faculty.collegeId,
      department: faculty.department,
      role: "hod"
    });

    if (hod && updatedExam) {
      await sendEmail(
        hod.email,
        "Action Required: New Question Paper Submitted",
        `Dear ${hod.name},\n\nA new question paper for "${updatedExam.subjectName}" (${subjectCode}) has been submitted by ${faculty.name}.\n\nPlease log in to your HOD dashboard to review and approve or reject this submission.\n\nRegards,\nAISS Exam System`
      );
    }

    res.status(201).json({ success: true, message: "Question paper uploaded!", newPaper });
  } catch (error) {
    console.error("❌ Error uploading question paper:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


// 3. HOD: Get pending question papers for their department
export const getPendingPapers = async (req, res) => {
  try {
    const hod = await Faculty.findById(req.user.id);

    // Find all exams in this HOD's department and college
    const deptExams = await Exam.find({
      collegeId: hod.collegeId,
      department: hod.department
    }).select("_id");

    const examIds = deptExams.map(exam => exam._id);

    // Fetch the pending papers linked to those specific exams
    const pendingPapers = await QuestionPaper.find({
      examId: { $in: examIds },
      status: "Pending"
    })
    .populate("examId", "subjectName subjectCode date")
    .populate("createdBy", "name email");

    res.status(200).json({ pendingPapers });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

// 4.Get all approved papers for the HOD's department
// controllers/questionPaperController.js

export const getApprovedPapers = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get the HOD's profile to know their Department and College
    const user = await Faculty.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // 2. Find all Exams that belong to this HOD's specific Dept and College
    // This ensures an HOD from 'CSE' at 'College A' can't see 'CSE' papers from 'College B'
    const exams = await Exam.find({ 
      department: user.department, 
      collegeId: user.collegeId 
    }).select('_id');

    // 3. Extract just the IDs into an array: [id1, id2, id3...]
    const examIds = exams.map(exam => exam._id);

    // 4. Find all QuestionPapers linked to those Exams that are "Approved"
    const approvedPapers = await QuestionPaper.find({
      status: "Approved",
      examId: { $in: examIds }
    })
    .populate('examId', 'subjectName subjectCode date startTime maxMarks')
    .populate('createdBy', 'name email')
    .sort({ updatedAt: -1 });

    // 5. Send the final response
    res.status(200).json({ 
      count: approvedPapers.length,
      approvedPapers 
    });

  } catch (error) {
    console.error("Error fetching approved papers:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// 5. HOD: Approve or Reject a paper (Soft Reject Strategy)
export const reviewQuestionPaper = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { status, feedback } = req.body; 

    // 1. Validate the input
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be Approved or Rejected" });
    }

    // Require feedback if rejecting
    if (status === "Rejected" && (!feedback || feedback.trim() === "")) {
      return res.status(400).json({ message: "Feedback is required when rejecting a paper." });
    }

    // 2. Fetch the paper and populate details for the email
    const paper = await QuestionPaper.findById(paperId).populate("createdBy").populate("examId");
    if (!paper) return res.status(404).json({ message: "Question paper not found" });

    // 3. Update the paper (Notice we do NOT delete anything here!)
    paper.status = status;
    paper.feedback = feedback || "";
    paper.approvedBy = req.user.id;
    
    await paper.save();

    // 4. Notify the teacher
    const author = paper.createdBy;
    const subject = status === "Approved" ? "Question Paper Approved!" : "Question Paper Rejected - Revision Required";
    const body = status === "Approved" 
      ? `Great news! Your question paper for ${paper.examId.subjectName} has been approved.`
      : `Your question paper for ${paper.examId.subjectName} requires revision.\n\nHOD Feedback: ${feedback}\n\nPlease log in, edit your saved paper, and resubmit it.`;

    await sendEmail(author.email, subject, body);

    res.status(200).json({ message: `Question paper has been ${status.toLowerCase()}.` });
  } catch (error) {
    console.error("Error reviewing question paper:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// 6.TEACHER: Get all assignments (Populates the paper so the frontend can check the status)
export const getFacultyAssignments = async (req, res) => {
  try {
    const exams = await Exam.find({ assignedFaculty: req.user.id })
      .populate("questionPaper", "status feedback updatedAt") // Only pull what's needed for the dashboard list
      .sort({ date: 1 });
      
    res.status(200).json({ exams });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// EVERYONE: View the full Question Paper JSON (For editing or reviewing)
export const getQuestionPaperById = async (req, res) => {
  try {
    const { paperId } = req.params;

    // 1. Safely extract the logged-in user's ID directly from the token payload
    const userId = req.user.id || req.user._id;
    const userIdString = userId.toString();

    // 2. Fetch the paper
    const paper = await QuestionPaper.findById(paperId)
      .populate("examId", "subjectName subjectCode date maxMarks duration")
      .populate("createdBy", "name email");

    if (!paper) return res.status(404).json({ message: "Question paper not found" });

    // 3. Fetch the logged-in user's profile to check their role and college
    const user = await Faculty.findById(userIdString);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 4. Safely extract the paper author's ID (handles both populated and unpopulated states)
    const authorIdString = paper.createdBy._id ? paper.createdBy._id.toString() : paper.createdBy.toString();

    // --- SECURITY CHECKS ---
    
    // Check A: Is this the person who wrote the paper?
    const isAuthor = authorIdString === userIdString;

    // Check B: Is this an HOD or College Admin from the SAME college?
    const paperCollegeIdString = paper.collegeId ? paper.collegeId.toString() : "";
    const userCollegeIdString = user.collegeId ? user.collegeId.toString() : "";
    
    const isAuthorizedAdmin = (user.role === "hod" || user.role === "collegeAdmin") && 
                              (userCollegeIdString === paperCollegeIdString); 

    // If they aren't the author, AND they aren't the boss... block them.
    if (!isAuthor && !isAuthorizedAdmin) {
       console.log(`[Auth Block] User ${userIdString} tried to access Paper ${paperId}`);
       return res.status(403).json({ message: "Unauthorized to view this paper" });
    }

    // 5. Success! Send the paper.
    res.status(200).json({ paper });
  } catch (error) {
    console.error("Error fetching question paper:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// 7.TEACHER: Fix a rejected paper and resubmit
export const updateQuestionPaper = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { instructions, sections, sectionChoices } = req.body;

    const paper = await QuestionPaper.findById(paperId).populate("examId");
    if (!paper) return res.status(404).json({ message: "Question paper not found" });

    // 1. Security: Only the author can edit
    if (paper.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only edit your own papers." });
    }

    // 2. Logic: Cannot edit a paper that is already approved
    if (paper.status === "Approved") {
      return res.status(400).json({ message: "Cannot edit an approved paper." });
    }

    // 3. Apply the updates and reset the status
    paper.instructions = instructions;
    paper.sections = sections;
    paper.sectionChoices = sectionChoices;
    paper.status = "Pending"; // Send it back to the HOD's queue
    paper.feedback = ""; // Clear the old feedback

    await paper.save();

    res.status(200).json({ message: "Paper successfully updated and resubmitted for review.", paper });
  } catch (error) {
    console.error("Error updating question paper:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};