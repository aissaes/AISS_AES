import Student from "../../models/student.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import FacultyCourseAssignment from "../../models/facultyCourseAssignment.js";
import StudentCourseEnrollment from "../../models/studentCourseEnrollment.js";

// ==========================================
// 1. LOGIN STUDENT
// ==========================================
export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password." });
    }

    const student = await Student.findOne({ email })
      .populate("collegeId", "collegeName")
      .populate("department", "name code")
      .populate("semester", "semesterNumber semesterName academicYear status");
    if (!student) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // Create standard 1-day login token
    const token = jwt.sign(
      { id: student._id, role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Send token in HTTP-only cookie for high security
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // Remove password from the response object
    const studentData = student.toObject();
    delete studentData.password;

    res.status(200).json({ success: true, message: "Login successful.", student: studentData, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ==========================================
// 2. LOGOUT STUDENT
// ==========================================
export const logoutStudent = (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error during logout." });
  }
};

// ==========================================
// 3. VIEW PROFILE (Self)
// ==========================================
export const viewProfile = async (req, res) => {
  try {
    // req.user.id comes from your verifyToken middleware
    const studentId = req.user.id; 

    // Fetch the student but EXCLUDE the password field and populate college name, department, and semester
    const student = await Student.findById(studentId)
      .select("-password")
      .populate("collegeId", "collegeName")
      .populate("department", "name code")
      .populate("semester", "semesterNumber semesterName academicYear status");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    // Query enrolled courses for the student from StudentCourseEnrollment
    const enrollments = await StudentCourseEnrollment.find({
      student: studentId,
      status: "Enrolled"
    }).populate({
      path: "course",
      select: "courseCode courseName credits department status"
    });

    const courses = enrollments
      .filter(enrollment => enrollment.course)
      .map(enrollment => enrollment.course.toObject());

    // Resolve active faculty assignments for the enrolled courses
    const courseIds = courses.map(c => c._id);
    const assignments = await FacultyCourseAssignment.find({
      course: { $in: courseIds },
      status: "Active"
    }).populate("faculty", "name email");

    const assignmentMap = {};
    assignments.forEach(asg => {
      assignmentMap[asg.course.toString()] = asg.faculty;
    });

    const studentObj = student.toObject();
    studentObj.courses = courses.map(course => {
      course.assignedFaculty = assignmentMap[course._id.toString()] || null;
      return course;
    });

    res.status(200).json({ success: true, student: studentObj });
  } catch (error) {
    console.error("View profile error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ==========================================
// 4. RESET / CHANGE PASSWORD (Self-Serve)
// ==========================================
export const resetPassword = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Please provide both old and new passwords." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    // Verify the old password is correct before allowing the change
    const isMatch = await bcrypt.compare(oldPassword, student.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect old password." });
    }

    // Hash and save the new password
    student.password = await bcrypt.hash(newPassword, 10);
    await student.save();

    res.status(200).json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};