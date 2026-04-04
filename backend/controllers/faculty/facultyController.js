import Faculty from "../../models/faculty.js";
import bcrypt from "bcryptjs";
import sendEmail from "../../configurations/nodemailer.js";
// Fetch the complete profile of the currently logged-in user
export const getMyProfile = async (req, res) => {
  try {
    // req.user.id is securely extracted from the HTTP-Only cookie by the verifyToken middleware
    const faculty = await Faculty.findById(req.user.id)
                                 .select("-password -otp -otpExpires")
                                 .populate("collegeId", "collegeName location"); 

    if (!faculty) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ 
      message: "Profile fetched successfully",
      profile: faculty 
    });

  } catch (error) {
    console.error("Error fetching my profile:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// Update basic profile details (Requires Password)
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, password } = req.body; // Extract the password
    
    // 1. Mandate the password field
    if (!password) {
      return res.status(400).json({ message: "Please provide your current password to update your profile." });
    }

    // 2. Fetch the faculty member to get their hashed password
    const faculty = await Faculty.findById(req.user.id);
    if (!faculty) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3. Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password, faculty.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password. Update denied." });
    }

    // 4. If password is correct, strictly control what can be updated
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;

    // 5. Apply the updates
    const updatedFaculty = await Faculty.findByIdAndUpdate(
      req.user.id, 
      updates, 
      { new: true }
    ).select("-password -otp -otpExpires"); // Don't send sensitive data back

    res.status(200).json({ 
      message: "Profile updated successfully", 
      profile: updatedFaculty 
    });

  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// password changing
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide both your current and new password." });
    }

    // 1. Fetch the user (we need the password hash, so we don't use .select("-password") here!)
    const faculty = await Faculty.findById(req.user.id);
    if (!faculty) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Verify the current password
    const isMatch = await bcrypt.compare(currentPassword, faculty.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password. Password change denied." });
    }

    // 3. Prevent changing to the exact same password
    const isSamePassword = await bcrypt.compare(newPassword, faculty.password);
    if (isSamePassword) {
      return res.status(400).json({ message: "New password cannot be the same as the old password." });
    }

    // 4. Hash and save the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    faculty.password = hashedNewPassword;
    await faculty.save();

    res.status(200).json({ message: "Password changed successfully." });

  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


// Fetch lists of pending, approved, and rejected faculty By Hod or super admin
export const getFacultyApprovedList = async (req, res) => {
  try {
    // req.user.id comes from your auth middleware
    const adminId = req.user.id;

    // Find the logged-in HOD/SuperAdmin and populate the references
    // We only select the fields we actually need to show on the frontend card/table
    const admin = await Faculty.findById(adminId)
      .populate("pendingApprovals", "name email department phone collegeId")
      .populate("acceptedApprovals", "name email department phone collegeId");

    if (!admin) {
      return res.status(404).json({ message: "Admin user not found" });
    }

    res.status(200).json({
      message: "Dashboard data fetched successfully",
      data: {
        pending: admin.pendingApprovals,
        approved: admin.acceptedApprovals,
        rejected: admin.rejectedApprovals // Remember, we embedded these directly, so no populate needed!
      }
    });

  } catch (error) {
    console.error("Error fetching approval dashboard:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// Approve Faculty
export const approveFaculty = async (req, res) => {
  try {

    const { facultyId } = req.body;

    const faculty = await Faculty.findById(facultyId);

    if (!faculty)
      return res.status(404).json({ message: "Faculty not found" });

    faculty.isApproved = true;
    faculty.approvedBy = req.user.id;

    await faculty.save();

    const approver = await Faculty.findById(req.user.id);

    approver.pendingApprovals.pull(facultyId);
    approver.acceptedApprovals.push(facultyId);

    await approver.save();

    // send approval email
    await sendEmail(
      faculty.email,
      "Faculty Registration Approved",
      "Your registration has been approved. You can now login to the system."
    );

    res.json({ message: "Faculty approved successfully" });

  } catch (error) {
    res.status(500).json(error);
  }
};

// Reject Faculty
export const rejectFaculty = async (req, res) => {
  try {
    const { facultyId, rejectedReason } = req.body;

    const faculty = await Faculty.findById(facultyId);

    if (!faculty)
      return res.status(404).json({ message: "Faculty not found" });

    const approver = await Faculty.findById(req.user.id);

    // 1. Remove from pending approvals
    approver.pendingApprovals.pull(facultyId);

    // 2. Store the historical snapshot in rejectedApprovals
    approver.rejectedApprovals.push({
      name: faculty.name,
      email: faculty.email,
      department: faculty.department,
      rejectedReason
    });

    await approver.save();

    // 3. Store email before deleting the document
    const rejectedEmail = faculty.email;

    // 4. HARD DELETE: Free up their email
    await Faculty.findByIdAndDelete(facultyId);

    // 5. Send rejection email
    await sendEmail(
      rejectedEmail,
      "Faculty Registration Rejected",
      `Your registration request has been rejected.\n\nReason: ${rejectedReason}
      \n\nIf this was a mistake, you may re-register with correct details.`
    );

    res.json({ message: "Faculty rejected and removed from system successfully" });

  } catch (error) {
    console.error("Error rejecting faculty:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};


// 1. Get faculty for a specific department (For HOD & Super Admin)
export const getDepartmentFaculty = async (req, res) => {
  try {
    const currentUser = await Faculty.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Determine which department to fetch based on role
    let targetDepartment = currentUser.department; // Default to the logged-in user's department (Perfect for HODs)
    
    if (currentUser.role === "collegeAdmin" && req.query.department) {
      targetDepartment = req.query.department;
    }

    // Fetch all approved faculty in that specific department
    const deptFaculty = await Faculty.find({
      collegeId: currentUser.collegeId,
      department: targetDepartment,
      isApproved: true,
      role: { $in: ["faculty", "hod"] } // Exclude the super admin from this list
    }).select("-password -otp -otpExpires"); 

    res.status(200).json({
      message: `Faculty list fetched for ${targetDepartment}`,
      faculty: deptFaculty
    });

  } catch (error) {
    console.error("Error fetching department faculty:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};
