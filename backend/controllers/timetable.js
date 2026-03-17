// import Timetable from "../models/timetable.js";
// import Exam from "../models/exam.js";
// import Faculty from "../models/faculty.js";
// import sendEmail from "../configurations/nodemailer.js";

// export const createTimetable = async (req, res) => {
//   try {
//     const { course, department, semester, examType, examDetails } = req.body;
    
//     // examDetails expects an array of objects:
//     // [{ subjectName, subjectCode, date, maxMarks, startTime, endTime, assignedFaculty, instructions }]

//     if (!examDetails || examDetails.length === 0) {
//       return res.status(400).json({ message: "Please provide exam details to create a timetable." });
//     }

//     const createdExams = [];
//     const examIds = [];

//     // 1. Create individual Exam documents
//     for (const detail of examDetails) {
//       const newExam = new Exam({
//         subjectName: detail.subjectName,
//         subjectCode: detail.subjectCode,
//         course,
//         semester,
//         examType,
//         date: detail.date,
//         maxMarks: detail.maxMarks,
//         instructions: detail.instructions,
//         startTime: detail.startTime,
//         endTime: detail.endTime,
//         assignedFaculty: detail.assignedFaculty 
//       });

//       const savedExam = await newExam.save();
//       createdExams.push(savedExam); // Saving the full object to send back to the frontend
//       examIds.push(savedExam._id);  // Saving the ID to link to the Timetable

//       // 2. Notify the assigned faculty
//       const assignedUser = await Faculty.findById(detail.assignedFaculty);
//       if (assignedUser) {
//         await sendEmail(
//           assignedUser.email,
//           "New Exam Assignment",
//           `You have been assigned to prepare the question paper for ${detail.subjectName} (${detail.subjectCode}). Exam Date: ${new Date(detail.date).toDateString()}. Please log in to upload the paper.`
//         );
//       }
//     }

//     // 3. Create the parent Timetable document linking all exams
//     const timetable = await Timetable.create({
//       course,
//       department,
//       semester,
//       examType,
//       exams: examIds,
//       createdBy: req.user.id // Extracted from the auth middleware
//     });

//     res.status(201).json({
//       message: "Timetable and Exams created successfully, and faculty notified.",
//       timetable,
//       createdExams 
//     });

//   } catch (error) {
//     console.error("Error creating timetable:", error);
//     res.status(500).json({ message: "Internal server error", error });
//   }
// };

// // 1. Get all timetables for a specific department
// export const getTimetables = async (req, res) => {
//   try {
//     const { department } = req.query; // e.g., /api/timetable?department=Computer Science
    
//     // Build query dynamically based on whether a department filter was provided
//     const query = department ? { department } : {};

//     // Fetch timetables and populate the actual exam details
//     const timetables = await Timetable.find(query)
//       .populate({
//         path: 'exams',
//         populate: { path: 'assignedFaculty', select: 'name email' } // Get faculty names too!
//       })
//       .sort({ createdAt: -1 });

//     res.status(200).json({ timetables });
//   } catch (error) {
//     console.error("Error fetching timetables:", error);
//     res.status(500).json({ message: "Internal server error", error });
//   }
// };

// // 2. Update a specific Exam slot (e.g., change date or assigned faculty)
// export const updateExam = async (req, res) => {
//   try {
//     const { examId } = req.params;
//     const updates = req.body;

//     const updatedExam = await Exam.findByIdAndUpdate(examId, updates, { new: true });

//     if (!updatedExam) {
//       return res.status(404).json({ message: "Exam not found" });
//     }

//     res.status(200).json({ message: "Exam updated successfully", updatedExam });
//   } catch (error) {
//     console.error("Error updating exam:", error);
//     res.status(500).json({ message: "Internal server error", error });
//   }
// };

// // 3. Delete a specific Exam slot
// export const deleteExam = async (req, res) => {
//   try {
//     const { examId } = req.params;

//     const exam = await Exam.findById(examId);
//     if (!exam) {
//       return res.status(404).json({ message: "Exam not found" });
//     }

//     // Remove the exam from the parent Timetable array
//     await Timetable.updateMany(
//       { exams: examId },
//       { $pull: { exams: examId } }
//     );

//     // Delete the exam itself
//     await Exam.findByIdAndDelete(examId);

//     res.status(200).json({ message: "Exam deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting exam:", error);
//     res.status(500).json({ message: "Internal server error", error });
//   }
// };