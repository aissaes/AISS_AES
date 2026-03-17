
import Faculty from "../../models/faculty.js";
import bcrypt from "bcryptjs"; 

// Get all faculty for the entire college (Strictly for Super Admin)
export const getAllCollegeFaculty = async (req, res) => {
  try {
    const currentUser = await Faculty.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch everyone in the college who is approved
    const allFaculty = await Faculty.find({
      college: currentUser.college,
      isApproved: true
    }).select("-password -otp -otpExpires").sort({ department: 1 }); // Sort alphabetically by department for a cleaner UI

    res.status(200).json({
      message: `All faculty fetched for ${currentUser.college}`,
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

    faculty.role = "hod";
    await faculty.save();

    res.json({ message: "Faculty successfully promoted to HOD" });

  } catch (error) {
    console.error("Error making HOD:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};


export const transferSuperAdmin = async (req, res) => {
  try {
    // We now require TWO things: who gets the power, and where the old admin goes
    const { facultyId, newDepartment } = req.body; 

    if (!newDepartment) {
      return res.status(400).json({ 
        message: "You must specify your new department before stepping down." 
      });
    }

    const currentAdminId = req.user.id; // From verifyToken

    // 1. Find both users
    const currentAdmin = await Faculty.findById(currentAdminId);
    const futureAdmin = await Faculty.findById(facultyId);

    if (!futureAdmin) {
      return res.status(404).json({ message: "The selected faculty member does not exist." });
    }

    // 2. Demote the current Super Admin and reassign their department
    currentAdmin.role = "faculty";
    currentAdmin.department = newDepartment; // <-- This fixes your bug!
    currentAdmin.superAdminRole = null; // Optional: Clean up their old title (like "Dean")

    // 3. Promote the new Super Admin and move them to Administration
    futureAdmin.role = "superAdmin";
    futureAdmin.department = "Administration"; // <-- Move the new boss to the admin department

    // 4. Save both
    await currentAdmin.save();
    await futureAdmin.save();

    res.status(200).json({ 
      message: `Transfer complete. You are now standard faculty in the ${newDepartment} department.` 
    });

  } catch (error) {
    console.error("Transfer error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};