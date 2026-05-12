import Answers from "../models/answer.js";
import Exam from "../models/exam.js"

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