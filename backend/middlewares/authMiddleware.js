import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    // Read the token directly from the cookies!
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded payload (id, role) to the request object
    req.user = decoded; 

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};