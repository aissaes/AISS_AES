import Semester from "../../models/semester.js";
import Faculty from "../../models/faculty.js";
import Student from "../../models/student.js";
import Course from "../../models/course.js";
import StudentCourseEnrollment from "../../models/studentCourseEnrollment.js";

// 1. Create Semester
export const createSemester = async (req, res) => {
  try {
    const { semesterNumber, semesterName, academicYear } = req.body;
    if (!semesterNumber || !semesterName || !academicYear) {
      return res.status(400).json({ message: "All fields are required (semesterNumber, semesterName, academicYear)." });
    }

    const hod = await Faculty.findById(req.user.id);
    if (!hod || hod.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can manage semesters." });
    }

    // Check if semester already exists in this college and department
    const existing = await Semester.findOne({
      collegeId: hod.collegeId,
      department: hod.department,
      semesterNumber,
      status: { $ne: "Archived" }
    });
    if (existing) {
      return res.status(400).json({ message: `Semester ${semesterNumber} already exists in your department.` });
    }

    const newSemester = new Semester({
      collegeId: hod.collegeId,
      department: hod.department,
      semesterNumber: Number(semesterNumber),
      semesterName,
      academicYear,
      status: "Active"
    });

    await newSemester.save();
    res.status(201).json({ message: "Semester created successfully.", semester: newSemester });
  } catch (error) {
    console.error("Error creating semester:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 2. Get Semesters
export const getSemesters = async (req, res) => {
  try {
    const user = await Faculty.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Both HOD and faculty/admin should be able to view
    const query = { collegeId: user.collegeId };
    if (user.role !== "collegeAdmin") {
      query.department = user.department;
    }
    // Don't show archived by default unless requested
    if (req.query.includeArchived !== "true") {
      query.status = { $ne: "Archived" };
    }

    const semesters = await Semester.find(query).sort({ semesterNumber: 1 });
    res.status(200).json({ semesters });
  } catch (error) {
    console.error("Error fetching semesters:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 3. Update Semester
export const updateSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const { semesterName, academicYear, status } = req.body;

    const hod = await Faculty.findById(req.user.id);
    if (!hod || hod.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can manage semesters." });
    }

    const semesterDoc = await Semester.findOne({ _id: id, collegeId: hod.collegeId, department: hod.department });
    if (!semesterDoc) {
      return res.status(404).json({ message: "Semester not found." });
    }

    if (semesterName) semesterDoc.semesterName = semesterName;
    if (academicYear) semesterDoc.academicYear = academicYear;
    if (status) semesterDoc.status = status;

    await semesterDoc.save();
    res.status(200).json({ message: "Semester updated successfully.", semester: semesterDoc });
  } catch (error) {
    console.error("Error updating semester:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 4. Toggle Semester Status (Archive / Activate)
export const toggleSemesterStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // e.g. "Active", "Inactive", "Archived"

    const hod = await Faculty.findById(req.user.id);
    if (!hod || hod.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can manage semesters." });
    }

    const semesterDoc = await Semester.findOne({ _id: id, collegeId: hod.collegeId, department: hod.department });
    if (!semesterDoc) {
      return res.status(404).json({ message: "Semester not found." });
    }

    semesterDoc.status = status;
    await semesterDoc.save();

    res.status(200).json({ message: `Semester status toggled to ${status}.`, semester: semesterDoc });
  } catch (error) {
    console.error("Error toggling semester status:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
