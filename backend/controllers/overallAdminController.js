import College from "../models/college.js";
import Faculty from "../models/faculty.js";
import OverallAdmin from "../models/overallAdmin.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sendEmail from "../configurations/nodemailer.js";

export const addCollegeAndAdmin = async (req, res) => {
  try {
    const { 
      collegeName, 
      location, 
      departments, // Array of strings: ["CSE", "Mechanical", "Civil"]
      adminName, 
      adminEmail, 
      adminPhone 
    } = req.body;

    // 1. Validation
    if (!collegeName || !adminName || !adminEmail || !adminPhone) {
      return res.status(400).json({ message: "All college and admin fields are required." });
    }

    // 2. Check for duplicates
    const existingCollege = await College.findOne({ collegeName });
    if (existingCollege) {
      return res.status(400).json({ message: "A college with this name already exists." });
    }

    const existingUser = await Faculty.findOne({ email: adminEmail });
    if (existingUser) {
      return res.status(400).json({ message: "This admin email is already in use." });
    }

    // 3. Generate secure temporary password of length =8
    const temporaryPassword = crypto.randomBytes(4).toString('hex'); 
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // 4. Create the College document FIRST so we have an ID
    const newCollege = await College.create({
      collegeName,
      location,
      departments,
      collegeAdminId: null // We will update this in a second
    });

    // 5. Create the College Admin using the new College's ObjectId
    const newCollegeAdmin = await Faculty.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      collegeId: newCollege._id, // <-- UPDATED
      department: "Administration",
      phone: adminPhone,
      role: "collegeAdmin",
      isApproved: true
    });

    // 6. Link the Admin back to the College
    newCollege.collegeAdminId = newCollegeAdmin._id;
    await newCollege.save();

    // 6. Send the welcome email with credentials
    await sendEmail(
      adminEmail,
      "Welcome to AISS - Your College Dashboard is Ready",
      `Dear ${adminName},

        Your college workspace for ${collegeName} has been successfully provisioned on the AISS platform.

        You are designated as the College Admin. You can now log in, set up your departments, and invite your HODs.

        Your Login Credentials:
        Email: ${adminEmail}
        Temporary Password: ${temporaryPassword}

        Please log in and update your password immediately.

        Best Regards,
        The AISS Team`
    );

    res.status(201).json({
      message: `${collegeName} successfully provisioned! Credentials emailed to ${adminEmail}.`,
      college: newCollege
    });

  } catch (error) {
    console.error("Error creating college:", error);
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