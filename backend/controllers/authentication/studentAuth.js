import Student from "../../models/student.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ==========================================
// 1. LOGIN STUDENT
// ==========================================
export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password." });
    }

    const student = await Student.findOne({ email });
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

    // Fetch the student but EXCLUDE the password field
    const student = await Student.findById(studentId).select("-password");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    res.status(200).json({ success: true, student });
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