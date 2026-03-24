
import Faculty from "../../models/faculty.js";
import College from "../../models/college.js";
import bcrypt from "bcryptjs"; 
import sendEmail from "../../configurations/nodemailer.js";

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
    futureAdmin.role = "collegeAdmin";
    futureAdmin.department = "Administration"; 

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
    const { departments } = req.body; // Expecting an array: ["CSE", "Mechanical", "AI"]
    const adminId = req.user.id;

    if (!Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({ message: "Please provide a valid array of departments." });
    }

    // 1. Find the admin to get their collegeId
    const adminUser = await Faculty.findById(adminId);
    if (!adminUser || adminUser.role !== "collegeAdmin") {
      return res.status(403).json({ message: "Only the College Admin can update departments." });
    }

    // 2. Find their specific college
    const college = await College.findById(adminUser.collegeId);
    if (!college) {
      return res.status(404).json({ message: "College not found." });
    }

    // 3. Update and save
    college.departments = departments;
    await college.save();

    res.status(200).json({ 
      message: "Departments updated successfully", 
      departments: college.departments 
    });

  } catch (error) {
    console.error("Error updating departments:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};