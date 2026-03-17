// import QuestionPaper from "../models/questionPapers.js";
// import Exam from "../models/exam.js";
// import Faculty from "../models/faculty.js";

// // Upload the actual question paper for a specific exam
// export const uploadQuestionPaper = async (req, res) => {
//   try {
//     const { examId, sections, sectionChoices } = req.body;

//     // 1. Find the Exam
//     const exam = await Exam.findById(examId);

//     if (!exam) {
//       return res.status(404).json({ message: "Exam not found" });
//     }

//     // 2. Verify the logged-in user is the officially assigned faculty
//     if (exam.assignedFaculty.toString() !== req.user.id) {
//       return res.status(403).json({ message: "Unauthorized: You are not assigned to this exam" });
//     }

//     if (exam.isPaperQuestionUploaded) {
//       return res.status(400).json({ message: "A question paper is already uploaded for this exam" });
//     }

//     // 3. Create the Question Paper document
//     const questionPaper = await QuestionPaper.create({
//       sections,
//       sectionChoices
//     });

//     // 4. Link the paper to the Exam and update the status
//     exam.questionPaper = questionPaper._id;
//     exam.isPaperQuestionUploaded = true;
//     await exam.save();

//     // 5. Add to the Faculty's record of prepared papers
//     const faculty = await Faculty.findById(req.user.id);
//     faculty.questionPapersPrepared.push(questionPaper._id);
//     await faculty.save();

//     res.status(201).json({ 
//       message: "Question paper successfully uploaded and linked to the exam",
//       questionPaper
//     });

//   } catch (error) {
//     console.error("Error uploading question paper:", error);
//     res.status(500).json({ message: "Internal server error", error });
//   }
// };

// // Fetch exams assigned to the currently logged-in faculty
// export const getMyAssignedExams = async (req, res) => {
//   try {
//     // req.user.id comes from your JWT auth middleware
//     const exams = await Exam.find({ assignedFaculty: req.user.id })
//                             .sort({ date: 1 }); // Sort by upcoming dates first

//     res.json({ exams });
//   } catch (error) {
//     console.error("Error fetching assigned exams:", error);
//     res.status(500).json({ message: "Internal server error", error });
//   }
// };

// // Fetch exams where the faculty has ALREADY uploaded the question paper
// export const getMyPreparedPapers = async (req, res) => {
//   try {
//     // Find exams assigned to this faculty where the paper IS uploaded
//     const pastExams = await Exam.find({ 
//       assignedFaculty: req.user.id,
//       isPaperQuestionUploaded: true 
//     })
//     .sort({ date: -1 }) // Sort by most recent first
//     .populate("questionPaper"); // Pull in the actual question paper details

//     res.json({ pastExams });
//   } catch (error) {
//     console.error("Error fetching prepared papers:", error);
//     res.status(500).json({ message: "Internal server error", error });
//   }
// };


// // Fetch the actual question paper details for a specific exam (for Hod)
// export const viewQuestionPaper = async (req, res) => {
//   try {
//     const { examId } = req.params;

//     // Find the exam and populate the question paper details
//     const exam = await Exam.findById(examId).populate("questionPaper");

//     if (!exam) {
//       return res.status(404).json({ message: "Exam not found" });
//     }

//     if (!exam.isPaperQuestionUploaded || !exam.questionPaper) {
//       return res.status(400).json({ message: "Question paper has not been uploaded yet." });
//     }

//     res.status(200).json({ 
//       message: "Question paper retrieved",
//       subjectName: exam.subjectName,
//       subjectCode: exam.subjectCode,
//       questionPaper: exam.questionPaper 
//     });

//   } catch (error) {
//     console.error("Error viewing question paper:", error);
//     res.status(500).json({ message: "Internal server error", error });
//   }
// };