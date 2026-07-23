import rateLimit from "express-rate-limit";

// Strict limit for authentication endpoints (OTP requests, logins, verifications, resets)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per 15 minutes
  message: {
    success: false,
    message: "Too many attempts from this IP. Please try again after 15 minutes."
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// General rate limiter for standard API routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});
