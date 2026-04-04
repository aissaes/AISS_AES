import Student from "../../models/student.js";
import Faculty from "../../models/faculty.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sendEmail from "../../configurations/nodemailer.js"; // Ensure your mailer path is correct

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
// 1 & 2: CREATION CONTROLLERS (Strict Validation)
// ==========================================

export const addSingleStudent = async (req, res) => {
  try {
    const { name, rollNumber, email, course, department, semester } = req.body;
    
    // 1. Fetch HOD
    const hod = await Faculty.findById(req.user.id);
    if (!hod) return res.status(404).json({ message: "HOD profile not found." });

    // 2. Strict Missing Field Checks
    const missingFields = [];
    if (!name) missingFields.push("Name");
    if (!rollNumber) missingFields.push("Roll Number");
    if (!email) missingFields.push("Email");
    if (!course) missingFields.push("Course");
    if (!department) missingFields.push("Department");
    if (!semester) missingFields.push("Semester");
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(", ")}` 
      });
    }

    // 3. Strict HOD Mismatch Checks
    const mismatches = [];
    if (department !== hod.department) mismatches.push(`Department (Expected ${hod.department}, got ${department})`);
    if (course !== hod.course) mismatches.push(`Course (Expected ${hod.course}, got ${course})`);
    
    // We don't need to check college from input usually, we just assign it from the HOD.
    
    if (mismatches.length > 0) {
      return res.status(403).json({ 
        message: `Authorization Error: You can only add students to your own jurisdiction. Mismatches found: ${mismatches.join(", ")}` 
      });
    }

    // 4. Duplicate Checks
    const existingStudent = await Student.findOne({ $or: [{ email }, { rollNumber }] });
    if (existingStudent) {
      return res.status(400).json({ message: "Student with this Email or Roll Number already exists." });
    }

    // 5. Creation
    const rawPassword = crypto.randomBytes(4).toString('hex'); 
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newStudent = await Student.create({
      name, rollNumber, email, password: hashedPassword,
      collegeId: hod.collegeId, 
      department: hod.department, // Safely locking it to HOD's dept
      course: hod.course,         // Safely locking it to HOD's course
      semester: Number(semester),
    });

    // 📧 EMAIL: Welcome & Password Delivery
    const subject = "Welcome to the AISS Exam Portal";
    const body = `Dear ${name},\n\nYour account has been successfully created by your Head of Department.\n\nYour Login Email: ${email}\nYour Temporary Password: ${rawPassword}\n\nPlease log in and change your password immediately.`;
    
    sendEmail(email, subject, body).catch(err => console.error(`Email failed for ${email}:`, err));

    res.status(201).json({ message: "Student added successfully.", student: newStudent, temporaryPassword: rawPassword });
  } catch (error) {
    res.status(500).json({ message: "Server error adding student.", error: error.message });
  }
};


export const bulkUploadStudents = async (req, res) => {
  try {
    const { students } = req.body; 
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: "No valid student array provided." });
    }

    const hod = await Faculty.findById(req.user.id);
    let successCount = 0;
    const errors = [];

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      const rowNum = i + 1; // For better error tracking
      
      try {
        // Map excel/json keys (adjust casing if your frontend sends lowercase)
        const { Name, RollNumber, Email, Course, Department, Semester } = studentData;
        
        const missing = [];
        if (!Name) missing.push("Name");
        if (!RollNumber) missing.push("RollNumber");
        if (!Email) missing.push("Email");
        if (!Course) missing.push("Course");
        if (!Department) missing.push("Department");
        if (!Semester) missing.push("Semester");

        if (missing.length > 0) {
          errors.push(`Row ${rowNum} (${Email || RollNumber || 'Unknown'}): Missing fields -> ${missing.join(", ")}`);
          continue; 
        }

        // HOD Jurisdiction Validation
        if (Course !== hod.course) {
          errors.push(`Row ${rowNum} (${Email}): Course mismatch. Expected ${hod.course}, got ${Course}`);
          continue;
        }
        if (Department !== hod.department) {
          errors.push(`Row ${rowNum} (${Email}): Dept mismatch. Expected ${hod.department}, got ${Department}`);
          continue;
        }

        // Duplicate Validation
        const existing = await Student.findOne({ $or: [{ email: Email }, { rollNumber: RollNumber }] });
        if (existing) {
          errors.push(`Row ${rowNum} (${Email}): Duplicate Email or Roll Number already exists in database.`);
          continue; 
        }

        // Creation
        const rawPassword = crypto.randomBytes(4).toString('hex'); 
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        await Student.create({
          name: Name, rollNumber: RollNumber, email: Email, password: hashedPassword,
          collegeId: hod.collegeId, 
          department: hod.department, 
          course: hod.course, 
          semester: Number(Semester),
        });

        // Background Email
        const subject = "Welcome to the AISS Exam Portal";
        const body = `Dear ${Name},\n\nYour account has been created.\n\nLogin: ${Email}\nPassword: ${rawPassword}\n\nPlease change your password upon logging in.`;
        sendEmail(Email, subject, body).catch(err => console.error(`Email failed for ${Email}:`, err));

        successCount++;
      } catch (err) {
        errors.push(`Row ${rowNum} (${studentData.Email || 'Unknown'}): Server error -> ${err.message}`);
      }
    }
    
    res.status(200).json({ 
      message: "Bulk upload finished.", 
      successfullyAdded: successCount, 
      totalErrors: errors.length,
      errors 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during bulk upload." });
  }
};

// ==========================================
//  READING CONTROLLERS
// ==========================================

export const getDepartmentStudents = async (req, res) => {
  try {
    const hod = await Faculty.findById(req.user.id);
    
    const filter = { collegeId: hod.collegeId, department: hod.department, course: hod.course };
    if (req.query.semester) filter.semester = Number(req.query.semester);
    if (req.query.course) filter.course = req.query.course;

    const students = await Student.find(filter).select("-password").sort({ semester: 1, rollNumber: 1 });
    res.status(200).json({ count: students.length, students });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching students." });
  }
};


// ==========================================
// 5, 6, 7: UPDATING CONTROLLERS (With Security Emails)
// ==========================================

export const updateSingleStudent = async (req, res) => {
  try {
    const hod = await Faculty.findById(req.user.id);
    const { name, rollNumber, email, course, semester } = req.body;

    // First, find the student to check if their email is changing
    const oldStudent = await Student.findOne({ 
      _id: req.params.studentId, collegeId: hod.collegeId, department: hod.department, course: hod.course
    });

    if (!oldStudent) return res.status(404).json({ message: "Student not found in your department." });

    const oldEmail = oldStudent.email;

    // Apply updates
    if (name) oldStudent.name = name;
    if (rollNumber) oldStudent.rollNumber = rollNumber;
    if (email) oldStudent.email = email;
    if (course) oldStudent.course = course;
    if (semester) oldStudent.semester = Number(semester);

    await oldStudent.save();

    // 📧 EMAIL: Security alert if email address was changed
    if (email && email !== oldEmail) {
      sendEmail(oldEmail, "Security Alert: Email Changed", "Your AISS account email has been changed to " + email + " by your HOD. If this was a mistake, please contact administration.").catch(err => console.error(err));
      sendEmail(email, "AISS Account Update", "Your AISS account email has been successfully updated to this address.").catch(err => console.error(err));
    }

    // Return the student data without the password
    const studentResponse = oldStudent.toObject();
    delete studentResponse.password;

    res.status(200).json({ message: "Student updated.", student: studentResponse });
  } catch (error) {
    res.status(500).json({ message: "Server error updating student.", error: error.message });
  }
};

export const bulkUpdateStudents = async (req, res) => {
  try {
    const { updates } = req.body; 
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "No update data provided." });
    }

    const hod = await Faculty.findById(req.user.id);

    const bulkOperations = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.id, collegeId: hod.collegeId, department: hod.department, course: hod.course },
        update: { $set: update.data },
      }
    }));

    const result = await Student.bulkWrite(bulkOperations);
    res.status(200).json({ message: "Bulk update complete.", matched: result.matchedCount, modified: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: "Server error during bulk update.", error: error.message });
  }
};


// ==========================================
// 7 & 8 : DELETION CONTROLLERS (With Goodbye Email)
// ==========================================

export const deleteSingleStudent = async (req, res) => {
  try {
    const hod = await Faculty.findById(req.user.id);
    const deletedStudent = await Student.findOneAndDelete({ 
      _id: req.params.studentId, collegeId: hod.collegeId, department: hod.department,course: hod.course 
    });

    if (!deletedStudent) return res.status(404).json({ message: "Student not found in your department." });

    // 📧 EMAIL: Account Deactivation Notice
    sendEmail(deletedStudent.email, "AISS Account Deactivated", `Dear ${deletedStudent.name},\n\nYour AISS Exam Portal account has been deactivated by your Head of Department. You no longer have access to the system.\n\nIf you believe this is an error, please contact your department.`).catch(err => console.error(err));

    res.status(200).json({ message: "Student deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error deleting student." });
  }
};

export const bulkDeleteStudents = async (req, res) => {
  try {
    const { studentIds } = req.body; 
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: "No student IDs provided for deletion." });
    }

    const hod = await Faculty.findById(req.user.id);

    const result = await Student.deleteMany({
      _id: { $in: studentIds }, collegeId: hod.collegeId, department: hod.department,course: hod.course
    });

    res.status(200).json({ message: "Bulk deletion complete.", requestedDeletions: studentIds.length, actualDeleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: "Server error during bulk deletion.", error: error.message });
  }
};
