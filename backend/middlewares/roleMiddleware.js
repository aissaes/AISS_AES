import Faculty from "../models/faculty.js"; // Make sure to import your model!

// 1. Dual Role Check
export const isHODOrSuperAdmin = async (req, res, next) => {
  try {
    // Fetch the fresh user from the database using the ID from the token
    const user = await Faculty.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check their REAL-TIME role in the database
    if (user.role === "hod" || user.role === "superAdmin") {
      next();
    } else {
      return res.status(403).json({ message: "Access denied. Requires HOD or Super Admin role." });
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

// 3. Strict Super Admin Check
export const isSuperAdmin = async (req, res, next) => {
  try {
    const user = await Faculty.findById(req.user.id);
    if (user && user.role === "superAdmin") {
      next();
    } else {
      return res.status(403).json({ message: "Access denied. Super Admin role required." });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error verifying role.", error });
  }
};