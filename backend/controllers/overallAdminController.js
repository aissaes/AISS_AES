import College from "../models/college.js";
import Faculty from "../models/faculty.js";
import OverallAdmin from "../models/overallAdmin.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sendEmail from "../configurations/nodemailer.js";

// 1. View all pending colleges
export const getPendingColleges = async (req, res) => {
  try {
    // We populate the admin details so the Overall Admin can see who requested it
    const pendingColleges = await College.find({ status: "Pending" })
                                         .populate("collegeAdminId", "name email phone");
    
    res.status(200).json({ colleges: pendingColleges });
  } catch (error) {
    res.status(500).json({ message: "Error fetching pending colleges", error: error.message });
  }
};

// 2. Approve the college
export const approveCollege = async (req, res) => {
  try {
    const { collegeId } = req.params;

    const college = await College.findById(collegeId);
    if (!college || college.status !== "Pending") {
      return res.status(404).json({ message: "Pending college not found." });
    }

    const admin = await Faculty.findById(college.collegeAdminId);

    // 1. Generate an 8-character random password (4 bytes hex = 8 chars)
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    // 2. Flip the switches and apply the new password
    college.status = "Approved";
    await college.save();

    if (admin) {
      admin.isApproved = true;
      admin.password = hashedTempPassword; // Overwrite the dummy password
      await admin.save();

      // 3. Send the Welcome Email WITH the temporary password
      await sendEmail(
        admin.email,
        "Your College has been Approved - AISS Platform",
        `Dear ${admin.name},

        Great news! Your request to register ${college.collegeName} has been approved.
        
        Your workspace is now live. Please log in using the credentials below and change your password immediately.

        Login Email: ${admin.email}
        Temporary Password: ${tempPassword}

        Best Regards,
        The AISS Team`
      );
    }

    res.status(200).json({ message: "College approved, password generated, and email sent!" });

  } catch (error) {
    console.error("Error approving college:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const changeOverallAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide both your current and new password." });
    }

    // Query the OverallAdmin collection, NOT Faculty
    const admin = await OverallAdmin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: "Overall Admin not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password. Password change denied." });
    }

    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      return res.status(400).json({ message: "New password cannot be the same as the old password." });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedNewPassword;
    await admin.save();

    res.status(200).json({ message: "Overall Admin password changed successfully." });

  } catch (error) {
    console.error("Error changing admin password:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Transfer Overall Admin rights to a new person securely
export const transferOverallAdmin = async (req, res) => {
  try {
    // REMOVED newAdminPassword - the current admin shouldn't know it!
    const { currentPassword, newAdminName, newAdminEmail } = req.body;

    // 1. Strict validation
    if (!currentPassword || !newAdminName || !newAdminEmail) {
      return res.status(400).json({ message: "All fields are required to transfer ownership." });
    }

    // 2. Fetch the current logged-in admin
    const currentAdmin = await OverallAdmin.findById(req.user.id);
    if (!currentAdmin) {
      return res.status(404).json({ message: "Current admin not found." });
    }

    // 3. SECURITY CHECK: Verify current password
    const isMatch = await bcrypt.compare(currentPassword, currentAdmin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password. Transfer denied." });
    }

    // 4. Ensure the new email isn't already an admin
    const existingAdmin = await OverallAdmin.findOne({ email: newAdminEmail });
    if (existingAdmin) {
      return res.status(400).json({ message: "An admin with this email already exists." });
    }

    // 5. Generate a secure random password (12 characters)
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hashedNewPassword = await bcrypt.hash(tempPassword, 10);
    
    // 6. Create the new Master Account
    await OverallAdmin.create({
      name: newAdminName,
      email: newAdminEmail,
      password: hashedNewPassword
    });

    // 7. Delete the old admin account (Transfer complete!)
    await OverallAdmin.findByIdAndDelete(req.user.id);

    // 8. Notify the new owner via email WITH the secure password
    await sendEmail(
      newAdminEmail,
      "Master Admin Rights Transferred - AISS Platform",
      `Dear ${newAdminName},
      
      You have been granted Master Overall Admin privileges for the AISS platform.
      
      You can now log in using this email and the temporary password below. For your security, please log in and change your password immediately.
      
      Login Email: ${newAdminEmail}
      Temporary Password: ${tempPassword}
      
      Regards,
      The AISS System`
    ).catch(err => console.error("Failed to send admin transfer email:", err));

    // 9. Clear the cookie so the old admin is automatically logged out
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({ 
      message: "Overall Admin rights successfully transferred. A temporary password has been emailed to the new admin. You have been logged out." 
    });

  } catch (error) {
    console.error("Error transferring overall admin:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};