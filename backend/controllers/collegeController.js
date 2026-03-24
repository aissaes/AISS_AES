import College from "../models/college.js";
import crypto from "crypto";
import Faculty from "../models/faculty.js";
import bcrypt from "bcryptjs";
import OverallAdmin from "../models/overallAdmin.js";
import sendEmail from "../configurations/nodemailer.js";

export const getAllCollegesList = async (req, res) => {
  try {
    // Only fetch colleges where status is NOT 'Pending'
    // We only send the _id and collegeName to keep the payload tiny and fast
    const colleges = await College.find({ status: { $ne: 'Pending' } }).select('_id collegeName');
    
    res.status(200).json({ colleges });
  } catch (error) {
    console.error("Error fetching colleges:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// 2. Fetch departments for a specific college (Triggered when user selects a college)
export const getCollegeDepartments = async (req, res) => {
  try {
    const { collegeId } = req.params;

    const college = await College.findById(collegeId).select('departments');
    if (!college) {
      return res.status(404).json({ message: "College not found" });
    }

    res.status(200).json({ departments: college.departments });
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// POST: Public route for the landing page form
// POST: Public route for the landing page form
export const collegeRegisterRequest = async (req, res) => {
  try {
    const { collegeName, location, departments, adminName, adminEmail, adminPhone } = req.body;

    if (!collegeName || !adminName || !adminEmail) {
      return res.status(400).json({ message: "Required fields are missing." });
    }

    // 1. Check for duplicates
    const existingCollege = await College.findOne({ collegeName });
    if (existingCollege) return res.status(400).json({ message: "College name already exists." });

    const existingUser = await Faculty.findOne({ email: adminEmail });
    if (existingUser) return res.status(400).json({ message: "Email already in use." });

    // 2. Create a "Dummy" locked password for the pending state
    const dummyPassword = crypto.randomBytes(16).toString('hex');
    const hashedDummy = await bcrypt.hash(dummyPassword, 10);

    // 3. Create the College (Pending)
    const newCollege = await College.create({
      collegeName,
      location,
      departments,
      collegeAdminId: null,
      status: "Pending"
    });

    // 4. Create the Admin (isApproved: false)
    const newAdmin = await Faculty.create({
      name: adminName,
      email: adminEmail,
      password: hashedDummy,
      collegeId: newCollege._id,
      department: "Administration",
      phone: adminPhone,
      role: "collegeAdmin",
      isApproved: false 
    });

    // 5. Link them
    newCollege.collegeAdminId = newAdmin._id;
    await newCollege.save();

    // 6. Notify the Overall Admin via Email
    try {
      // Find the master admin account
      const masterAdmin = await OverallAdmin.findOne(); 
      
      if (masterAdmin && masterAdmin.email) {
        await sendEmail(
          masterAdmin.email,
          "Action Required: New College Registration - AISS Platform",
          `Hello ${masterAdmin.name},\n\nA new college has just requested to join the AISS platform.\n\nCollege Details:\n- College Name: ${collegeName}\n- Location: ${location || 'Not provided'}\n- Applicant Name: ${adminName}\n- Applicant Email: ${adminEmail}\n\nPlease log in to your Overall Admin dashboard to review and approve/reject this request.\n\nBest Regards,\nThe AISS System`
        );
      }
    } catch (emailError) {
      console.error("Failed to send notification email to overall admin:", emailError);
      // We don't throw the error here so the user still gets a success response!
    }

    res.status(201).json({ message: "Request submitted successfully! Waiting for Overall Admin approval." });

  } catch (error) {
    console.error("Error submitting request:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};