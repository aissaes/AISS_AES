import College from "../models/college.js";
import crypto from "crypto";

// 1. Fetch all colleges (ID and Name only) for the frontend dropdown
export const getAllCollegesList = async (req, res) => {
  try {
    // We only send the _id and collegeName to keep the payload tiny and fast
    const colleges = await College.find().select('_id collegeName');
    
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
export const collegeRegisterRequest = async (req, res) => {
  try {
    // REMOVED 'password' from req.body
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
      status: "Pending" // Assuming you added this to your schema!
    });

    // 4. Create the Admin (isApproved: false)
    const newAdmin = await Faculty.create({
      name: adminName,
      email: adminEmail,
      password: hashedDummy, // Assigned the locked dummy password
      collegeId: newCollege._id,
      department: "Administration",
      phone: adminPhone,
      role: "collegeAdmin",
      isApproved: false 
    });

    // 5. Link them
    newCollege.collegeAdminId = newAdmin._id;
    await newCollege.save();

    res.status(201).json({ message: "Request submitted successfully! Waiting for Overall Admin approval." });

  } catch (error) {
    console.error("Error submitting request:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};