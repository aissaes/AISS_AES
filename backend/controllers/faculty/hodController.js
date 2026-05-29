import Student from "../../models/student.js";
import Faculty from "../../models/faculty.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sendEmail from "../../configurations/nodemailer.js"; // Ensure your mailer path is correct
import generateSessionToken from "../../utils/generateToken.js";
import Exam from "../../models/exam.js";
import generateQR from "../../utils/qrcode.js";

// 1. Transfer HOD (Current HOD hands over power to another faculty member)
export const transferHOD = async (req, res) => {
  try {
    const { newHODId } = req.body; 
    const currentHODId = req.user.id; 

    // 1. Find the person getting promoted
    const newHOD = await Faculty.findById(newHODId);
    if (!newHOD) {
      return res.status(404).json({ message: "Target faculty member not found" });
    }

    // 2. Ensure they are in the same college AND department
    const currentHOD = await Faculty.findById(currentHODId);
    if (newHOD.collegeId.toString() !== currentHOD.collegeId.toString() || newHOD.department !== currentHOD.department) {
      return res.status(403).json({ message: "You can only transfer the role to someone in your own college and department." });
    }

    // 3. Demote the current HOD
    currentHOD.role = "faculty";
    await currentHOD.save();

    // 4. Promote the new person
    newHOD.role = "hod";
    await newHOD.save();

    // --- 5. NEW EMAIL NOTIFICATION BLOCK ---
    const subject = "Transfer of Head of Department (HOD) Role - AISS Platform";
    const body = `Dear ${newHOD.name},\n\nThe Head of Department (HOD) role for the ${newHOD.department} department has been officially transferred to you.\n\nYou now have full access to the HOD Dashboard to manage timetables, assign faculty, and review question papers.\n\nRegards,\nCollege Administration`;

    await sendEmail(newHOD.email, subject, body).catch(err => {
      console.error("Failed to send HOD transfer email:", err);
    });

    res.status(200).json({ 
      message: `You have successfully transferred the HOD role to ${newHOD.name}. You are now standard faculty.` 
    });

  } catch (error) {
    console.error("Error transferring HOD:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// ==========================================
// COURSE ENROLLMENT & ASSIGNMENT (HOD Only)
// ==========================================
import Semester from "../../models/semester.js";
import Course from "../../models/course.js";
import StudentCourseEnrollment from "../../models/studentCourseEnrollment.js";

export const assignStudentsToCourse = async (req, res) => {
  try {
    const { studentIds, semesterId, courseIds } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: "Please provide a valid array of student IDs to assign." });
    }
    if (!semesterId) {
      return res.status(400).json({ message: "Please select a target semester." });
    }
    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ message: "Please select at least one course for enrollment." });
    }

    const hod = await Faculty.findById(req.user.id);
    if (!hod || hod.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can assign students to courses." });
    }

    // Verify semester exists
    const semesterDoc = await Semester.findOne({
      _id: semesterId,
      collegeId: hod.collegeId,
      department: hod.department
    });
    if (!semesterDoc) {
      return res.status(404).json({ message: "Selected semester not found in your department." });
    }

    // Verify courses exist
    const courses = await Course.find({
      _id: { $in: courseIds },
      collegeId: hod.collegeId,
      department: hod.department
    });
    if (courses.length === 0) {
      return res.status(404).json({ message: "No matching courses found in your department." });
    }

    // Query students
    const students = await Student.find({ _id: { $in: studentIds }, collegeId: hod.collegeId });
    if (students.length === 0) {
      return res.status(404).json({ message: "No matching student accounts found in your college." });
    }

    let count = 0;
    for (const student of students) {
      let isUpdated = false;

      if (!student.department || student.department.toString() !== hod.department.toString()) {
        student.department = hod.department;
        isUpdated = true;
      }

      if (student.semester?.toString() !== semesterId.toString()) {
        student.semester = semesterId;
        isUpdated = true;
      }

      for (const courseDoc of courses) {
        // Save join table enrollment record
        await StudentCourseEnrollment.findOneAndUpdate(
          { student: student._id, course: courseDoc._id },
          { semester: semesterId, academicYear: semesterDoc.academicYear, status: "Enrolled" },
          { upsert: true, new: true }
        );
      }

      if (isUpdated) {
        await student.save();
      }
      count++;
    }

    res.status(200).json({
      message: `Successfully enrolled ${count} students into ${courses.length} courses for ${semesterDoc.semesterName}.`
    });
  } catch (error) {
    console.error("Error assigning students:", error);
    res.status(500).json({ message: "Server error assigning students to course.", error: error.message });
  }
};

export const unassignStudentsFromCourse = async (req, res) => {
  try {
    const { studentIds, courseId } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: "Please provide a valid array of student IDs to unassign." });
    }

    const hod = await Faculty.findById(req.user.id);
    if (!hod || hod.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can unassign students from courses." });
    }

    const students = await Student.find({ _id: { $in: studentIds }, collegeId: hod.collegeId });
    if (students.length === 0) {
      return res.status(404).json({ message: "No matching student accounts found in your college." });
    }

    let count = 0;
    for (const student of students) {
      let isUpdated = false;

      if (courseId) {
        // Unenroll from specific course
        const delResult = await StudentCourseEnrollment.deleteMany({
          student: student._id,
          course: courseId
        });
        if (delResult.deletedCount > 0) isUpdated = true;
      } else {
        // Unenroll from all courses in HOD's department
        const courses = await Course.find({ collegeId: hod.collegeId, department: hod.department });

        const delResult = await StudentCourseEnrollment.deleteMany({
          student: student._id,
          course: { $in: courses.map(c => c._id) }
        });
        if (delResult.deletedCount > 0) isUpdated = true;
      }

      if (isUpdated) {
        count++;
      }
    }

    res.status(200).json({
      message: `Successfully unassigned ${count} students.`
    });
  } catch (error) {
    console.error("Error unassigning students:", error);
    res.status(500).json({ message: "Server error unassigning students from course.", error: error.message });
  }
};

export const getDepartmentStudents = async (req, res) => {
  try {
    const hod = await Faculty.findById(req.user.id);
    if (!hod) return res.status(404).json({ message: "HOD profile not found." });

    let filter = {
      collegeId: hod.collegeId,
      department: hod.department
    };

    if (req.query.semesterId) {
      filter.semester = req.query.semesterId;
    }

    if (req.query.courseId) {
      if (req.query.unassigned === "true") {
        const enrollments = await StudentCourseEnrollment.find({ course: req.query.courseId }).select('student');
        filter._id = { $nin: enrollments.map(e => e.student) };
      } else {
        const enrollments = await StudentCourseEnrollment.find({ course: req.query.courseId }).select('student');
        filter._id = { $in: enrollments.map(e => e.student) };
      }
    }

    const students = await Student.find(filter)
      .select("-password")
      .populate("semester", "semesterNumber semesterName academicYear status")
      .sort({ rollNumber: 1 });

    const formattedStudents = [];
    for (const student of students) {
        const studentObj = student.toObject();
        const enrollments = await StudentCourseEnrollment.find({ student: student._id }).populate("course", "courseCode courseName credits department status");
        studentObj.courses = enrollments.map(e => e.course).filter(c => c != null);
        formattedStudents.push(studentObj);
    }

    res.status(200).json({ count: formattedStudents.length, students: formattedStudents });
  } catch (error) {
    console.error("Error fetching HOD department students:", error);
    res.status(500).json({ message: "Server error fetching department students." });
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
    const exam = await Exam.findById(examId).populate("courseId");

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "No such exam found",
      });
    }

    const hod = await Faculty.findById(req.user.id);
    // 2. SECURITY CHECK: Does this HOD own this exam?
    if (exam.collegeId.toString() !== hod.collegeId.toString() || exam.courseId.department.toString() !== hod.department.toString()) {
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
    const exam = await Exam.findById(examId).populate("courseId");

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "No such exam found",
      });
    }
    
    const hod = await Faculty.findById(req.user.id);
    // 2. SECURITY CHECK: Does this HOD own this exam?
    if (exam.collegeId.toString() !== hod.collegeId.toString() || exam.courseId.department.toString() !== hod.department.toString()) {
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
};

export const updateStudentAcademics = async (req, res) => {
  try {
    const { studentId, semesterId, courseIds, academicYear } = req.body;
    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required." });
    }

    const hod = await Faculty.findById(req.user.id);
    if (!hod || hod.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can edit student academic details." });
    }

    const student = await Student.findOne({ _id: studentId, collegeId: hod.collegeId, department: hod.department });
    if (!student) {
      return res.status(404).json({ message: "Student not found in your department." });
    }

    // Verify semester exists
    let semesterDoc = null;
    if (semesterId) {
      semesterDoc = await Semester.findOne({ _id: semesterId, collegeId: hod.collegeId, department: hod.department });
      if (!semesterDoc) {
        return res.status(404).json({ message: "Selected semester not found." });
      }
      student.semester = semesterId;
    }

    // Course assignments mapping
    if (courseIds && Array.isArray(courseIds)) {
      const departmentCourses = await Course.find({ collegeId: hod.collegeId, department: hod.department });
      const deptCourseIdsStr = departmentCourses.map(c => c._id.toString());

      // Get new active courses
      const newCourses = departmentCourses.filter(c => courseIds.includes(c._id.toString()));
      
      for (const newCourse of newCourses) {
        const yr = academicYear || semesterDoc?.academicYear || "2026-2027";
        await StudentCourseEnrollment.findOneAndUpdate(
          { student: student._id, course: newCourse._id },
          { semester: student.semester || semesterId, academicYear: yr, status: "Enrolled" },
          { upsert: true, new: true }
        );
      }

      // Mark dropped courses in join table
      const newCourseIdsStr = newCourses.map(c => c._id.toString());
      const droppedCourseIds = deptCourseIdsStr.filter(cId => !newCourseIdsStr.includes(cId));
      if (droppedCourseIds.length > 0) {
        await StudentCourseEnrollment.updateMany(
          { student: student._id, course: { $in: droppedCourseIds }, status: "Enrolled" },
          { status: "Dropped" }
        );
      }
    }

    await student.save();

    const updatedStudent = await Student.findById(studentId).populate("semester");
    const enrollments = await StudentCourseEnrollment.find({ student: studentId }).populate("course");
    const updatedStudentObj = updatedStudent.toObject();
    updatedStudentObj.courses = enrollments.map(e => e.course).filter(c => c != null);

    res.status(200).json({
      message: "Student academic details updated successfully.",
      student: updatedStudentObj
    });
  } catch (error) {
    console.error("Error updating student academics:", error);
    res.status(500).json({ message: "Internal server error updating student academics.", error: error.message });
  }
};