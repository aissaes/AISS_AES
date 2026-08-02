import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    // 1. Try cookie first (web frontend uses httpOnly cookies)
    let token = req.cookies.token;

    // 2. Fallback: check Authorization header (mobile apps send Bearer tokens)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

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