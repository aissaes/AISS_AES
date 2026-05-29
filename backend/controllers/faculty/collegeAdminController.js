
import mongoose from "mongoose";
import Faculty from "../../models/faculty.js";
import College from "../../models/college.js";
import Student from "../../models/student.js";
import bcrypt from "bcryptjs"; 
import sendEmail from "../../configurations/nodemailer.js";
import crypto from "crypto";
import Semester from "../../models/semester.js";
import Course from "../../models/course.js";
import StudentCourseEnrollment from "../../models/studentCourseEnrollment.js";
import Department from "../../models/department.js";

const resolveRelationalSemesterAndCourse = async (collegeId, deptInput, semVal, courseVal) => {
  let deptDoc;
  if (deptInput && mongoose.Types.ObjectId.isValid(deptInput)) {
    deptDoc = await Department.findById(deptInput);
  }
  if (!deptDoc) {
    const deptName = deptInput || "General";
    deptDoc = await Department.findOne({ collegeId, name: deptName });
    if (!deptDoc) {
      deptDoc = new Department({ collegeId, name: deptName, code: deptName.substring(0, 5).toUpperCase() });
      await deptDoc.save();
    }
  }

  const semesterNum = Number(semVal) || 1;

  let semesterDoc = await Semester.findOne({
    collegeId,
    department: deptDoc._id,
    semesterNumber: semesterNum,
    status: "Active"
  });

  if (!semesterDoc) {
    semesterDoc = new Semester({
      collegeId,
      department: deptDoc._id,
      semesterNumber: semesterNum,
      semesterName: `Semester ${semesterNum}`,
      academicYear: "2026-2027",
      status: "Active"
    });
    await semesterDoc.save();
  }

  let courseDoc = null;
  if (courseVal) {
    courseDoc = await Course.findOne({
      collegeId,
      department: deptDoc._id,
      $or: [
        { courseCode: courseVal },
        { courseName: courseVal }
      ]
    });

    if (!courseDoc) {
      courseDoc = new Course({
        collegeId,
        courseCode: courseVal.split(' ').map(w => w[0]).join('').toUpperCase() + Math.floor(100 + Math.random() * 900),
        courseName: courseVal,
        department: deptDoc._id,
        semester: semesterDoc._id,
        credits: 3,
        status: "Active"
      });
      await courseDoc.save();
    }
  }

  return { semesterDoc, courseDoc, deptDoc };
};

// Get all faculty for the entire college (Strictly for Super Admin)
export const getAllCollegeFaculty = async (req, res) => {
  try {
    const currentUser = await Faculty.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch everyone in the college who is approved
    const allFaculty = await Faculty.find({
      collegeId: currentUser.collegeId, // <--- UPDATED TO MATCH NEW SCHEMA
      isApproved: true
    }).select("-password -otp -otpExpires").sort({ department: 1 }); // Sort alphabetically by department for a cleaner UI

    res.status(200).json({
        message: "All college faculty fetched successfully", 
        count: allFaculty.length,
        faculty: allFaculty
      });

  } catch (error) {
    console.error("Error fetching all college faculty:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};


// Make HOD (Super Admin explicitly promotes a faculty)
export const makeHOD = async (req, res) => {
  try {
    const { facultyId } = req.body;

    const faculty = await Faculty.findById(facultyId);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }
     
    if (faculty.role === "hod") {
      return res.status(400).json({ message: "Faculty is already an HOD" });
    }

    const adminUser = await Faculty.findById(req.user.id);
    
    if (faculty.collegeId.toString() !== adminUser.collegeId.toString()) {
      return res.status(403).json({ message: "You can only promote faculty within your own college." });
    }

    faculty.role = "hod";
    await faculty.save();

    const collegeDoc = await College.findById(faculty.collegeId);
    const collegeName = collegeDoc.collegeName;

    // --- NEW EMAIL NOTIFICATION BLOCK ---
    const subject = "Promotion to Head of Department (HOD) - AISS Platform";
    const body = `Dear ${faculty.name},\n\nCongratulations! You have been officially promoted to Head of Department (HOD) for the ${faculty.department} department at ${collegeName}.\n\nWhen you log in to the AISS platform, you will now have access to the HOD Dashboard where you can create timetables, assign question papers, and review faculty submissions.\n\nRegards,\nCollege Administration`;
    
    // We don't necessarily want to block the response if the email fails, 
    // but we do want to attempt to send it.
    await sendEmail(faculty.email, subject, body).catch(err => {
        console.error("Failed to send HOD promotion email:", err);
    });
 
    res.status(200).json({ message: "Faculty successfully promoted to HOD and notified via email." });

  } catch (error) {
    console.error("Error making HOD:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};


export const transferCollegeAdmin = async (req, res) => {
  try {
    const { facultyId, newDepartment } = req.body; 

    if (!newDepartment) {
      return res.status(400).json({ 
        message: "You must specify your new department before stepping down." 
      });
    }

    const currentAdminId = req.user.id; 

    // 1. Find both users
    const currentAdmin = await Faculty.findById(currentAdminId);
    const futureAdmin = await Faculty.findById(facultyId);

    if (!futureAdmin) {
      return res.status(404).json({ message: "The selected faculty member does not exist." });
    }

    // 2. SECURITY CHECK: Prevent transferring power outside the college!
    if (currentAdmin.collegeId.toString() !== futureAdmin.collegeId.toString()) {
      return res.status(403).json({ message: "You can only transfer admin rights to faculty within your own college." });
    }

    // 3. CRITICAL: Update the College document's admin reference
    const college = await College.findById(currentAdmin.collegeId);
    if (college) {
      college.collegeAdminId = futureAdmin._id;
      await college.save();
    }

    // 4. Demote the current Super Admin and reassign their department
    currentAdmin.role = "faculty";
    currentAdmin.department = newDepartment; 
    
    // 5. Promote the new Super Admin and move them to Administration
    let adminDept = await Department.findOne({ collegeId: currentAdmin.collegeId, name: "Administration" });
    if (!adminDept) {
      adminDept = await Department.create({ collegeId: currentAdmin.collegeId, name: "Administration", code: "ADMIN" });
    }
    futureAdmin.role = "collegeAdmin";
    futureAdmin.department = adminDept._id; 

    // 6. Save both user profiles
    await currentAdmin.save();
    await futureAdmin.save();

    // --- 7. NEW EMAIL NOTIFICATION BLOCK ---
    const collegeName = college ? college.collegeName : "your college";
    const subject = "Transfer of College Admin Rights - AISS Platform";
    const body = `Dear ${futureAdmin.name},\n\nYou have been granted College Admin privileges for ${collegeName}. You are now responsible for managing departments, faculty approvals, and platform settings for your institution.\n\nPlease log in to access your new Admin Dashboard.\n\nRegards,\nAISS Administration`;

    await sendEmail(futureAdmin.email, subject, body).catch(err => {
      console.error("Failed to send admin transfer email:", err);
    });

    res.status(200).json({ 
      message: `Transfer complete. You are now standard faculty in the ${newDepartment} department.` 
    });

  } catch (error) {
    console.error("Transfer error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// college admin can change departments in the college

export const updateCollegeDepartments = async (req, res) => {
  try {
    const { departments } = req.body; // Expecting array of strings or names
    const adminId = req.user.id;

    if (!Array.isArray(departments)) {
      return res.status(400).json({ message: "Please provide a valid array of departments." });
    }

    const adminUser = await Faculty.findById(adminId);
    if (!adminUser || adminUser.role !== "collegeAdmin") {
      return res.status(403).json({ message: "Only the College Admin can update departments." });
    }

    const college = await College.findById(adminUser.collegeId);
    if (!college) {
      return res.status(404).json({ message: "College not found." });
    }

    const departmentIds = [];
    const populatedDepartments = [];
    
    for (const deptString of departments) {
      let deptName = typeof deptString === "string" ? deptString : deptString.name;
      let deptCode = deptName.substring(0, 5).toUpperCase();
      let deptObj = await Department.findOne({ collegeId: adminUser.collegeId, name: deptName });
      if (!deptObj) {
        deptObj = new Department({ collegeId: adminUser.collegeId, name: deptName, code: deptCode });
        await deptObj.save();
      }
      departmentIds.push(deptObj._id);
      populatedDepartments.push(deptName); // Send back strings for UI compatibility
    }

    college.departments = departmentIds;
    await college.save();

    res.status(200).json({ 
      message: "Departments updated successfully", 
      departments: populatedDepartments 
    });

  } catch (error) {
    console.error("Error updating departments:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// ==========================================
// STUDENT PROFILE DIRECTORY CRUD (College Admin Only)
// ==========================================

export const addSingleStudent = async (req, res) => {
  try {
    const { name, rollNumber, email, course, department, semester } = req.body;
    
    // 1. Fetch Admin
    const adminUser = await Faculty.findById(req.user.id);
    if (!adminUser || adminUser.role !== "collegeAdmin") {
      return res.status(403).json({ message: "Only College Admins can register student accounts." });
    }

    // 2. Strict Missing Field Checks
    const missingFields = [];
    if (!name) missingFields.push("Name");
    if (!rollNumber) missingFields.push("Roll Number");
    if (!email) missingFields.push("Email");
    if (!semester) missingFields.push("Semester");
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(", ")}` 
      });
    }

    // 3. Duplicate Checks
    const existingStudent = await Student.findOne({ $or: [{ email }, { rollNumber }] });
    if (existingStudent) {
      return res.status(400).json({ message: "Student with this Email or Roll Number already exists." });
    }

    // 4. Creation
    const rawPassword = crypto.randomBytes(4).toString('hex'); 
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const { semesterDoc, courseDoc, deptDoc } = await resolveRelationalSemesterAndCourse(
      adminUser.collegeId,
      department,
      semester,
      course
    );

    const newStudent = await Student.create({
      name, 
      rollNumber, 
      email, 
      password: hashedPassword,
      collegeId: adminUser.collegeId, 
      department: deptDoc._id,
      semester: semesterDoc._id,
    });

    if (courseDoc) {
      const enrollment = new StudentCourseEnrollment({
        student: newStudent._id,
        course: courseDoc._id,
        semester: semesterDoc._id,
        academicYear: "2026-2027"
      });
      await enrollment.save().catch(() => {});
    }

    // Welcome & Password Delivery Email
    const subject = "Welcome to the AISS Exam Portal";
    const body = `Dear ${name},\n\nYour student account has been successfully created by your College Administrator.\n\nYour Login Email: ${email}\nYour Temporary Password: ${rawPassword}\n\nPlease log in and change your password immediately.`;
    
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

    const adminUser = await Faculty.findById(req.user.id);
    if (!adminUser || adminUser.role !== "collegeAdmin") {
      return res.status(403).json({ message: "Only College Admins can upload student records in bulk." });
    }

    let successCount = 0;
    const errors = [];

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      const rowNum = i + 1;
      
      try {
        const { Name, RollNumber, Email, Course: CourseInput, Department: DepartmentInput, Semester: SemesterInput } = studentData;
        
        const missing = [];
        if (!Name) missing.push("Name");
        if (!RollNumber) missing.push("RollNumber");
        if (!Email) missing.push("Email");
        if (!SemesterInput) missing.push("Semester");

        if (missing.length > 0) {
          errors.push(`Row ${rowNum} (${Email || RollNumber || 'Unknown'}): Missing fields -> ${missing.join(", ")}`);
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

        const { semesterDoc, courseDoc, deptDoc } = await resolveRelationalSemesterAndCourse(
          adminUser.collegeId,
          DepartmentInput,
          SemesterInput,
          CourseInput
        );

        const newStudent = await Student.create({
          name: Name, 
          rollNumber: RollNumber, 
          email: Email, 
          password: hashedPassword,
          collegeId: adminUser.collegeId, 
          department: deptDoc._id,
          semester: semesterDoc._id,
        });

        if (courseDoc) {
          const enrollment = new StudentCourseEnrollment({
            student: newStudent._id,
            course: courseDoc._id,
            semester: semesterDoc._id,
            academicYear: "2026-2027"
          });
          await enrollment.save().catch(() => {});
        }

        const subject = "Welcome to the AISS Exam Portal";
        const body = `Dear ${Name},\n\nYour student account has been created by your College Administrator.\n\nLogin: ${Email}\nPassword: ${rawPassword}\n\nPlease change your password upon logging in.`;
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

export const getAllCollegeStudents = async (req, res) => {
  try {
    const adminUser = await Faculty.findById(req.user.id);
    if (!adminUser) return res.status(404).json({ message: "User profile not found." });

    const students = await Student.find({ collegeId: adminUser.collegeId })
      .select("-password")
      .populate("semester", "semesterNumber semesterName academicYear status")
      .populate("department", "name code")
      .sort({ name: 1 });

    const formattedStudents = [];
    for (const s of students) {
      const studentObj = s.toObject();
      const enrollments = await StudentCourseEnrollment.find({ student: s._id }).populate("course");
      studentObj.courses = enrollments.map(e => e.course ? (e.course.courseName || e.course.courseCode) : "Unknown");
      studentObj.semester = studentObj.semester ? (studentObj.semester.semesterNumber || studentObj.semester.semesterName) : "N/A";
      studentObj.departmentName = studentObj.department ? studentObj.department.name : "N/A";
      formattedStudents.push(studentObj);
    }

    res.status(200).json({ count: formattedStudents.length, students: formattedStudents });
  } catch (error) {
    console.error("Error fetching college students:", error);
    res.status(500).json({ message: "Server error fetching college students." });
  }
};

export const updateSingleStudent = async (req, res) => {
  try {
    const adminUser = await Faculty.findById(req.user.id);
    if (!adminUser || adminUser.role !== "collegeAdmin") {
      return res.status(403).json({ message: "Only College Admins can edit student accounts." });
    }

    const { name, rollNumber, email, course, department, semester, cgpa } = req.body;

    const oldStudent = await Student.findOne({ 
      _id: req.params.studentId, collegeId: adminUser.collegeId
    });

    if (!oldStudent) return res.status(404).json({ message: "Student account not found in this college." });

    const oldEmail = oldStudent.email;

    if (name) oldStudent.name = name;
    if (rollNumber) oldStudent.rollNumber = rollNumber;
    if (email) oldStudent.email = email;
    if (cgpa !== undefined) oldStudent.cgpa = Number(cgpa);

    if (semester || department || course) {
      const deptName = department || (oldStudent.department ? oldStudent.department.toString() : "General");
      const { semesterDoc, courseDoc, deptDoc } = await resolveRelationalSemesterAndCourse(
        adminUser.collegeId,
        deptName,
        semester || 1,
        course
      );
      
      if (semester) oldStudent.semester = semesterDoc._id;
      if (department) oldStudent.department = deptDoc._id;
      
      if (courseDoc) {
        const existingEnrollment = await StudentCourseEnrollment.findOne({
          student: oldStudent._id,
          course: courseDoc._id
        });
        if (!existingEnrollment) {
          const enrollment = new StudentCourseEnrollment({
            student: oldStudent._id,
            course: courseDoc._id,
            semester: semesterDoc._id,
            academicYear: "2026-2027"
          });
          await enrollment.save().catch(() => {});
        }
      }
    }

    await oldStudent.save();

    if (email && email !== oldEmail) {
      sendEmail(oldEmail, "Security Alert: Email Changed", `Your account email has been changed to ${email}. If this was not you, please contact administration immediately.`).catch(err => console.error(err));
      sendEmail(email, "Account Update", "Your account email has been successfully updated to this address.").catch(err => console.error(err));
    }

    const studentResponse = oldStudent.toObject();
    delete studentResponse.password;

    res.status(200).json({ message: "Student account updated.", student: studentResponse });
  } catch (error) {
    res.status(500).json({ message: "Server error updating student.", error: error.message });
  }
};

export const deleteSingleStudent = async (req, res) => {
  try {
    const adminUser = await Faculty.findById(req.user.id);
    if (!adminUser || adminUser.role !== "collegeAdmin") {
      return res.status(403).json({ message: "Only College Admins can deactivate student accounts." });
    }

    const deletedStudent = await Student.findOneAndDelete({ 
      _id: req.params.studentId, collegeId: adminUser.collegeId
    });

    if (!deletedStudent) return res.status(404).json({ message: "Student account not found in your college." });

    sendEmail(deletedStudent.email, "AISS Account Deactivated", `Dear ${deletedStudent.name},\n\nYour exam portal account has been deactivated by your College Administrator.\n\nIf you believe this is an error, please contact administration.`).catch(err => console.error(err));

    res.status(200).json({ message: "Student account deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error deleting student account." });
  }
};

export const bulkDeleteStudents = async (req, res) => {
  try {
    const adminUser = await Faculty.findById(req.user.id);
    if (!adminUser || adminUser.role !== "collegeAdmin") {
      return res.status(403).json({ message: "Only College Admins can deactivate student accounts in bulk." });
    }

    const { studentIds } = req.body; 
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: "No student IDs provided for deletion." });
    }

    const result = await Student.deleteMany({
      _id: { $in: studentIds }, collegeId: adminUser.collegeId
    });

    res.status(200).json({ message: "Bulk deletion complete.", requestedDeletions: studentIds.length, actualDeleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: "Server error during bulk deletion.", error: error.message });
  }
};