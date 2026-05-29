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
// ==========================================
// COURSE ENROLLMENT & ASSIGNMENT (HOD Only)
// ==========================================

export const assignStudentsToCourse = async (req, res) => {
  try {
    const { studentIds } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: "Please provide a valid array of student IDs to assign." });
    }

    // 1. Fetch HOD details
    const hod = await Faculty.findById(req.user.id);
    if (!hod || hod.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can assign students to courses." });
    }

    // 2. Query students in same college
    const students = await Student.find({ _id: { $in: studentIds }, collegeId: hod.collegeId });
    
    if (students.length === 0) {
      return res.status(404).json({ message: "No matching student accounts found in your college." });
    }

    // 3. Update each student with HOD's department and course
    let count = 0;
    for (const student of students) {
      let isUpdated = false;
      
      if (!student.departments.includes(hod.department)) {
        student.departments.push(hod.department);
        isUpdated = true;
      }
      if (!student.courses.includes(hod.course)) {
        student.courses.push(hod.course);
        isUpdated = true;
      }
      
      if (isUpdated) {
        await student.save();
        count++;
      }
    }

    res.status(200).json({ 
      message: `Successfully assigned ${count} students to course ${hod.course} in department ${hod.department}.` 
    });
  } catch (error) {
    console.error("Error assigning students:", error);
    res.status(500).json({ message: "Server error assigning students to course.", error: error.message });
  }
};

export const unassignStudentsFromCourse = async (req, res) => {
  try {
    const { studentIds } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: "Please provide a valid array of student IDs to unassign." });
    }

    // 1. Fetch HOD details
    const hod = await Faculty.findById(req.user.id);
    if (!hod || hod.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can unassign students from courses." });
    }

    // 2. Query students in same college
    const students = await Student.find({ _id: { $in: studentIds }, collegeId: hod.collegeId });
    
    if (students.length === 0) {
      return res.status(404).json({ message: "No matching student accounts found in your college." });
    }

    // 3. Pull department and course
    let count = 0;
    for (const student of students) {
      let isUpdated = false;
      
      const prevDeptLen = student.departments.length;
      student.departments = student.departments.filter(d => d !== hod.department);
      if (student.departments.length !== prevDeptLen) isUpdated = true;

      const prevCrsLen = student.courses.length;
      student.courses = student.courses.filter(c => c !== hod.course);
      if (student.courses.length !== prevCrsLen) isUpdated = true;



      if (isUpdated) {
        await student.save();
        count++;
      }
    }

    res.status(200).json({ 
      message: `Successfully unassigned ${count} students from course ${hod.course} in department ${hod.department}.` 
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
    
    let filter = {};
    if (req.query.unassigned === "true") {
      filter = {
        collegeId: hod.collegeId,
        courses: { $ne: hod.course }
      };
    } else {
      filter = { 
        collegeId: hod.collegeId, 
        departments: hod.department, 
        courses: hod.course 
      };
    }
    if (req.query.semester) filter.semester = Number(req.query.semester);

    const students = await Student.find(filter).select("-password").sort({ semester: 1, rollNumber: 1 });
    res.status(200).json({ count: students.length, students });
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
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "No such exam found",
      });
    }

    const hod = await Faculty.findById(req.user.id);
    // 2. SECURITY CHECK: Does this HOD own this exam?
    if (exam.collegeId.toString() !== hod.collegeId.toString() || exam.department !== hod.department) {
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
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "No such exam found",
      });
    }
    
    const hod = await Faculty.findById(req.user.id);
    // 2. SECURITY CHECK: Does this HOD own this exam?
    if (exam.collegeId.toString() !== hod.collegeId.toString() || exam.department !== hod.department) {
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
}