import Timetable from "../models/timetable.js";
import Exam from "../models/exam.js";
import Faculty from "../models/faculty.js";
import College from "../models/college.js";
import sendEmail from "../configurations/nodemailer.js";
import QuestionPaper from "../models/questionPapers.js";

// 1. Create a new Timetable and its associated Exams
export const createTimetable = async (req, res) => {
  try {
    const { course, semester, examType, examDetails } = req.body;
    
    // We don't trust the frontend to send the department or college. 
    // We get it securely from the logged-in HOD's token!
    const hod = await Faculty.findById(req.user.id);
    if (!hod) return res.status(404).json({ message: "HOD not found" });

    if (!examDetails || examDetails.length === 0) {
      return res.status(400).json({ message: "Please provide exam details to create a timetable." });
    }

    const createdExams = [];
    const examIds = [];

    // Loop through and create individual Exam documents
    for (const detail of examDetails) {
      const newExam = new Exam({
        collegeId: hod.collegeId, // Secured
        department: hod.department, // Secured
        subjectName: detail.subjectName,
        subjectCode: detail.subjectCode,
        course,
        semester,
        examType,
        date: detail.date,
        maxMarks: detail.maxMarks, 
        startTime: detail.startTime,
        endTime: detail.endTime,
        assignedFaculty: detail.assignedFaculty 
      });

      const savedExam = await newExam.save();
      createdExams.push(savedExam); 
      examIds.push(savedExam._id); 

      // Notify the assigned faculty
      const assignedUser = await Faculty.findById(detail.assignedFaculty);
      if (assignedUser) {
        await sendEmail(
          assignedUser.email,
          "New Exam Assignment - Action Required",
          `Dear ${assignedUser.name},
           You have been assigned to prepare the question paper for ${detail.subjectName} (${detail.subjectCode}).
           Exam Date: ${new Date(detail.date).toDateString()}.
           
           Please log in to the AISS platform to upload the question paper.
           
           Regards,
           Your HOD`
        );
      }
    }

    // Create the parent Timetable document
    const timetable = await Timetable.create({
      collegeId: hod.collegeId,
      course,
      department: hod.department,
      semester,
      examType,
      exams: examIds,
      createdBy: req.user.id 
    });

    res.status(201).json({
      message: "Timetable and Exams created successfully, and faculty notified.",
      timetable,
      createdExams 
    });

  } catch (error) {
    console.error("Error creating timetable:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// 2. Get timetables (Filters by the user's College, Department, and Role)
export const getTimetables = async (req, res) => {
  try {
    const user = await Faculty.findById(req.user.id);
    
    const query = { collegeId: user.collegeId }; 
    
    // If the user is NOT a College Admin, restrict them to their specific department
    if (user.role !== "collegeAdmin") {
      query.department = user.department;
    }

    // 2. Fetch the timetables
    const timetables = await Timetable.find(query)
      .populate({
        path: 'exams',
        // removed the questionPaper ID from the payload 
        // so no one can even attempt to fetch it without permission.
        select: '-questionPaper', 
        populate: { path: 'assignedFaculty', select: 'name email' } 
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ timetables });
  } catch (error) {
    console.error("Error fetching timetables:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// 3. Add a NEW Exam to an EXISTING Timetable
export const addExamToTimetable = async (req, res) => {
  try {
    const { timetableId } = req.params;
    const detail = req.body; // Expecting a single exam object

    const timetable = await Timetable.findById(timetableId);
    if (!timetable) return res.status(404).json({ message: "Timetable not found" });

    // Ensure the HOD adding the exam owns this timetable
    if (timetable.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to modify this timetable" });
    }

    // Create the new Exam
    const newExam = new Exam({
      collegeId: timetable.collegeId,
      department: timetable.department,
      subjectName: detail.subjectName,
      subjectCode: detail.subjectCode,
      course: timetable.course,
      semester: timetable.semester,
      examType: timetable.examType,
      date: detail.date,
      maxMarks: detail.maxMarks,
      startTime: detail.startTime,
      endTime: detail.endTime,
      assignedFaculty: detail.assignedFaculty
    });

    const savedExam = await newExam.save();

    // Push the new exam ID into the parent Timetable
    timetable.exams.push(savedExam._id);
    await timetable.save();

    // Notify the assigned faculty
    const assignedUser = await Faculty.findById(detail.assignedFaculty);
    if (assignedUser) {
      await sendEmail(
        assignedUser.email,
        "New Exam Assignment - Action Required",
        `Dear ${assignedUser.name},
        You have been assigned to prepare the question paper for ${detail.subjectName} (${detail.subjectCode}) added to an existing timetable.
        Exam Date: ${new Date(detail.date).toDateString()}.
        Please log in to the AISS platform to upload the question paper.`
      );
    }

    res.status(201).json({ message: "Exam added to timetable successfully", exam: savedExam });
  } catch (error) {
    console.error("Error adding exam to timetable:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// 4. Update an Exam (Secured against IDOR)
export const updateExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const updates = req.body;

    // 1. Fetch the HOD and their College ID for verification
    const hod = await Faculty.findById(req.user.id);

    // 2. Fetch the Exam BEFORE updating it
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    // 3. SECURITY CHECK: Does this exam belong to this HOD's department and college?
    if (exam.collegeId.toString() !== hod.collegeId.toString() || exam.department !== hod.department) {
      return res.status(403).json({ message: "Unauthorized: You can only edit exams in your own department." });
    }

    // Prevent HOD from accidentally (or maliciously) changing critical routing IDs
    delete updates.collegeId;
    delete updates.department;

    // 4. Apply updates
    const updatedExam = await Exam.findByIdAndUpdate(examId, updates, { new: true });
    
    res.status(200).json({ message: "Exam updated successfully", updatedExam });
  } catch (error) {
    console.error("Error updating exam:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// 5. Delete an Exam (Secured + Cleans up orphaned Question Papers)
export const deleteExam = async (req, res) => {
  try {
    const { examId } = req.params;

    // 1. Fetch the HOD and their College ID
    const hod = await Faculty.findById(req.user.id);

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    // 2. SECURITY CHECK
    if (exam.collegeId.toString() !== hod.collegeId.toString() || exam.department !== hod.department) {
      return res.status(403).json({ message: "Unauthorized: You can only delete exams from your own department." });
    }

    // 3. CLEANUP: If a question paper was already uploaded for this exam, delete it!
    if (exam.questionPaper) {
      // Note: We use QuestionPaper model here, so make sure to import QuestionPaper at the top of your timetableController.js file!
      await QuestionPaper.findByIdAndDelete(exam.questionPaper);
    }

    // 4. Remove the exam from the parent Timetable array
    await Timetable.updateMany(
      { exams: examId },
      { $pull: { exams: examId } }
    );

    // 5. Finally, delete the exam itself
    await Exam.findByIdAndDelete(examId);

    res.status(200).json({ message: "Exam and any associated question papers deleted successfully" });
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// 6. Get a single Timetable by ID (Secured)
export const getTimetableById = async (req, res) => {
  try {
    const { timetableId } = req.params;

    // 1. Find who is asking
    const user = await Faculty.findById(req.user.id);

    // 2. Fetch the timetable
    const timetable = await Timetable.findById(timetableId)
      .populate({
        path: 'exams',
        select: '-questionPaper', // Hide the paper ID for security
        populate: { path: 'assignedFaculty', select: 'name email' }
      });

    if (!timetable) return res.status(404).json({ message: "Timetable not found" });

    // 3. SECURITY CHECK: Ensure it belongs to their college
    if (timetable.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({ message: "Unauthorized to view this college's data." });
    }

    // 4. SECURITY CHECK: Restrict to their department (unless they are College Admin)
    if (user.role !== "collegeAdmin" && timetable.department !== user.department) {
      return res.status(403).json({ message: "Unauthorized: You can only view timetables from your own department." });
    }

    res.status(200).json({ timetable });
  } catch (error) {
    console.error("Error fetching timetable details:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// 7. Get a single Exam by ID (Secured)
export const getExamById = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user.id; // From your auth middleware

    const user = await Faculty.findById(userId);
    const exam = await Exam.findById(examId).populate('assignedFaculty', 'name email');

    if (!exam) return res.status(404).json({ message: "Exam not found" });

    // --- SMART HIDING LOGIC ---
    
    // Check if the person asking is the HOD, the Admin, or the Teacher assigned to this exam
    const isAuthorizedToSeePaper = 
      user.role === "hod" || 
      user.role === "collegeAdmin" || 
      exam.assignedFaculty._id.toString() === userId;

    if (!isAuthorizedToSeePaper) {
      // If a random faculty member is looking, hide the paper ID
      exam.questionPaper = undefined; 
    }

    res.status(200).json({ exam });
  } catch (error) {
    console.error("Error fetching exam details:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};