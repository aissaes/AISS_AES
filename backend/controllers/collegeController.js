import College from "../models/college.js";

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