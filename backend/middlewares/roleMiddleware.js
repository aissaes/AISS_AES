import Faculty from "../models/faculty.js"; // Make sure to import your model!
import OverallAdmin from "../models/overallAdmin.js";

// 1. Dual Role Check
export const isHODOrCollegeAdmin = async (req, res, next) => {
  try {
    // Fetch the fresh user from the database using the ID from the token
    const user = await Faculty.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check their REAL-TIME role in the database
    if (user.role === "hod" || user.role === "collegeAdmin") {
      next();
    } else {
      return res.status(403).json({ message: "Access denied. Requires HOD or College Admin role." });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error verifying role.", error });
  }
};

// 2. Strict HOD Check
export const isHOD = async (req, res, next) => {
  try {
    const user = await Faculty.findById(req.user.id);
    if (user && user.role === "hod") {
      next();
    } else {
      return res.status(403).json({ message: "Access denied. HOD role required." });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error verifying role.", error });
  }
};

// 3. Strict College Admin Check
export const isCollegeAdmin = async (req, res, next) => {
  try {
    const user = await Faculty.findById(req.user.id);
    if (user && user.role === "collegeAdmin") {
      next();
    } else {
      return res.status(403).json({ message: "Access denied. College Admin role required." });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error verifying role.", error });
  }
};


// 4. Strict Overall Admin Check (God Mode)
export const isOverallAdmin = async (req, res, next) => {
  try {
    // 1. First, check the role encoded in the JWT payload
    if (req.user.role !== "overallAdmin") {
      return res.status(403).json({ message: "Access denied. Overall Admin role required." });
    }

    // 2. Double-check the database to ensure this master account hasn't been deleted
    const admin = await OverallAdmin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: "Overall Admin account not found in database." });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Internal server error verifying Overall Admin role.", error });
  }
};

// 5. Student check
export const isStudent = (req, res, next) => {
  if (req.user && req.user.role === 'student') { // Ensure 'student' matches how you save it in the DB payload
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Student resources only." });
  }
};