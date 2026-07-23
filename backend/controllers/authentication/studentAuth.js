import Student from "../../models/student.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import FacultyCourseAssignment from "../../models/facultyCourseAssignment.js";
import StudentCourseEnrollment from "../../models/studentCourseEnrollment.js";
import sendEmail from "../../configurations/nodemailer.js";
import { generateOTPTemplate } from "../../utils/emailTemplates.js";
import crypto from "crypto";

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

    // 1. Access Token (6 hours)
    const token = jwt.sign(
      { id: student._id, role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );

    // 2. Refresh Token (Perpetual / Non-Expiring: 10 Years for Student Mobile App)
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || (process.env.JWT_SECRET + "_refresh");
    const refreshToken = jwt.sign(
      { id: student._id, role: "student" },
      refreshTokenSecret,
      { expiresIn: "3650d" } // 10 years
    );

    // 3. Store Refresh Token in DB for instant revocation
    student.refreshToken = refreshToken;
    await student.save();

    // Send token in HTTP-only cookie for high security
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 3650 * 24 * 60 * 60 * 1000, // 10 years
    });

    // Remove password from the response object
    const studentData = student.toObject();
    delete studentData.password;

    res.status(200).json({ 
      success: true, 
      message: "Login successful.", 
      student: studentData,
      token,
      refreshToken
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ==========================================
// 2. LOGOUT STUDENT
// ==========================================
export const logoutStudent = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (refreshToken) {
      const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || (process.env.JWT_SECRET + "_refresh");
      try {
        const decoded = jwt.verify(refreshToken, refreshTokenSecret);
        await Student.findByIdAndUpdate(decoded.id, { refreshToken: null });
      } catch (e) {}
    }
  } catch (e) {}

  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "none" });
  res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: "none" });
  res.status(200).json({ success: true, message: "Logged out successfully." });
};

// ==========================================
// REFRESH STUDENT TOKEN
// ==========================================
export const refreshStudentToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "Refresh Token is required" });
    }

    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || (process.env.JWT_SECRET + "_refresh");
    const decoded = jwt.verify(refreshToken, refreshTokenSecret);

    const student = await Student.findById(decoded.id);
    if (!student || student.refreshToken !== refreshToken) {
      return res.status(403).json({ success: false, message: "Invalid or revoked Refresh Token. Please log in again." });
    }

    // ROTATION: Issue NEW 6-hour Access Token & NEW 10-year Refresh Token
    const newToken = jwt.sign(
      { id: student._id, role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );

    const newRefreshToken = jwt.sign(
      { id: student._id, role: "student" },
      refreshTokenSecret,
      { expiresIn: "3650d" } // 10 years
    );

    // Update DB with rotated Refresh Token
    student.refreshToken = newRefreshToken;
    await student.save();

    res.cookie("token", newToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 3650 * 24 * 60 * 60 * 1000, // 10 years
    });

    return res.status(200).json({ success: true, token: newToken, refreshToken: newRefreshToken, message: "Token refreshed and rotated successfully" });
  } catch (err) {
    return res.status(403).json({ success: false, message: "Expired or invalid Refresh Token", error: err.message });
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

// ==========================================
// 5. SEND PASSWORD RESET OTP (Forgot Password)
// ==========================================
export const forgotPasswordStudent = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ success: false, message: "No student account found with this email." });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    student.otp = otp;
    student.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    student.otpAttempts = 0;
    const otpHtml = generateOTPTemplate({
      recipientName: student.name || "Student",
      otpCode: otp,
      title: "Student Portal Password Reset OTP",
      subtitle: "Use the 6-digit One-Time Password below to reset your student portal password.",
      expireMinutes: 10
    });

    // Send reset OTP via email
    await sendEmail(
      email,
      "Password Reset OTP - AISS Platform",
      `Your One-Time Password (OTP) for password reset is: ${otp}`,
      otpHtml
    );

    res.status(200).json({ success: true, message: "Verification OTP sent to your email address." });

  } catch (error) {
    console.error("Forgot password OTP send error:", error);
    res.status(500).json({ success: false, message: "Failed to send verification email.", error: error.message });
  }
};

// ==========================================
// 6. VERIFY OTP & RESET FORGOTTEN PASSWORD
// ==========================================
export const resetForgottenPasswordStudent = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "All fields (email, otp, newPassword) are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student account not found." });
    }

    // Verify OTP matching and expiration
    if (!student.otp || student.otpExpires < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification OTP." });
    }

    if (student.otp !== otp) {
      student.otpAttempts = (student.otpAttempts || 0) + 1;
      if (student.otpAttempts >= 5) {
        student.otp = null;
        student.otpExpires = null;
        student.otpAttempts = 0;
        await student.save();
        return res.status(400).json({ success: false, message: "Invalid OTP. Maximum attempts exceeded. Please request a new OTP." });
      }
      await student.save();
      return res.status(400).json({ success: false, message: "Invalid or expired verification OTP." });
    }

    // Update password, clear OTP fields
    student.password = await bcrypt.hash(newPassword, 10);
    student.otp = null;
    student.otpExpires = null;
    student.otpAttempts = 0;
    await student.save();

    res.status(200).json({ success: true, message: "Your password has been successfully reset! You can now log in." });

  } catch (error) {
    console.error("Forgot password reset error:", error);
    res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};