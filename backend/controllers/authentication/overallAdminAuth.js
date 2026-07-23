import OverallAdmin from "../../models/overallAdmin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../../configurations/nodemailer.js";
import { generateOTPTemplate } from "../../utils/emailTemplates.js";

// 1. Hidden Seed Route (Run this ONCE in Postman to create your master account)
export const seedOverallAdmin = async (req, res) => {
  try {
    const { devKey, name, email, password } = req.body;

    if (devKey !== process.env.DEV_SECRET_KEY) {
      return res.status(403).json({ message: "Unauthorized: Invalid Developer Key" });
    }

    const existingAdmin = await OverallAdmin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Overall Admin already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await OverallAdmin.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({ message: "Master Overall Admin account created successfully." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

// 2. Login (Verifies password and sends OTP)
export const loginOverallAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await OverallAdmin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found." });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials." });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.otp = otp;
    admin.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    admin.otpAttempts = 0;
    await admin.save();

    const otpHtml = generateOTPTemplate({
      recipientName: admin.name || "Master Admin",
      otpCode: otp,
      title: "Overall Admin Portal OTP",
      subtitle: "Use the 6-digit One-Time Password below to sign in to the Overall Admin Master Portal.",
      expireMinutes: 5
    });

    await sendEmail(
      admin.email,
      "Overall Admin Login OTP - AISS Platform",
      `Your overall admin login OTP is: ${otp}`,
      otpHtml
    );

    res.status(200).json({ message: "OTP sent to your registered admin email." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

// 3. Verify OTP & Issue JWT
export const verifyOverallAdminOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const admin = await OverallAdmin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found." });

    if (!admin.otp || admin.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    if (admin.otp !== otp) {
      admin.otpAttempts = (admin.otpAttempts || 0) + 1;
      if (admin.otpAttempts >= 5) {
        admin.otp = null;
        admin.otpExpires = null;
        admin.otpAttempts = 0;
        await admin.save();
        return res.status(400).json({ message: "Invalid OTP. Maximum attempts exceeded. Please request a new OTP." });
      }
      await admin.save();
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // Clear OTP
    admin.otp = null;
    admin.otpExpires = null;
    admin.otpAttempts = 0;
    await admin.save();

    // Create a highly privileged JWT (6 hours)
    const token = jwt.sign(
      { id: admin._id, role: "overallAdmin" }, // Distinct role!
      process.env.JWT_SECRET,
      { expiresIn: "6h" } // Shorter expiry for high-security accounts
    );

    // 2. Refresh Token (Long-lived: 7 days)
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || (process.env.JWT_SECRET + "_refresh");
    const refreshToken = jwt.sign(
      { id: admin._id, role: "overallAdmin" },
      refreshTokenSecret,
      { expiresIn: "7d" }
    );

    // 3. Store Refresh Token in DB for instant revocation
    admin.refreshToken = refreshToken;
    await admin.save();

    res.cookie("token", token, {
      httpOnly: true,     // cannot be accessed by JS
      secure: true,       // required for SameSite=None on Vercel
      sameSite: "none",   // THIS ALLOWS THE CROSS-DOMAIN COOKIE
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,     // cannot be accessed by JS
      secure: true,       // required for SameSite=None on Vercel
      sameSite: "none",   // THIS ALLOWS THE CROSS-DOMAIN COOKIE
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({ 
      message: "Platform login successful.",
      role: "overallAdmin",
      token,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const logoutOverallAdmin = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (refreshToken) {
      const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || (process.env.JWT_SECRET + "_refresh");
      try {
        const decoded = jwt.verify(refreshToken, refreshTokenSecret);
        await OverallAdmin.findByIdAndUpdate(decoded.id, { refreshToken: null });
      } catch (e) {}
    }
  } catch (e) {}

  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).json({ message: "Overall Admin logged out successfully" });
};

export const refreshOverallAdminToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh Token is required" });
    }

    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || (process.env.JWT_SECRET + "_refresh");
    const decoded = jwt.verify(refreshToken, refreshTokenSecret);

    const admin = await OverallAdmin.findById(decoded.id);
    if (!admin || admin.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid or revoked Refresh Token. Please log in again." });
    }

    // ROTATION: Issue NEW 6-hour Access Token & NEW 7-day Refresh Token
    const newToken = jwt.sign(
      { id: admin._id, role: "overallAdmin" },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );

    const newRefreshToken = jwt.sign(
      { id: admin._id, role: "overallAdmin" },
      refreshTokenSecret,
      { expiresIn: "7d" }
    );

    // Update DB with rotated Refresh Token
    admin.refreshToken = newRefreshToken;
    await admin.save();

    res.cookie("token", newToken, {
      httpOnly: true,     // cannot be accessed by JS
      secure: true,       // required for SameSite=None on Vercel
      sameSite: "none",   // THIS ALLOWS THE CROSS-DOMAIN COOKIE
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,     // cannot be accessed by JS
      secure: true,       // required for SameSite=None on Vercel
      sameSite: "none",   // THIS ALLOWS THE CROSS-DOMAIN COOKIE
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({ token: newToken, refreshToken: newRefreshToken, message: "Token refreshed and rotated successfully" });
  } catch (err) {
    return res.status(403).json({ message: "Expired or invalid Refresh Token", error: err.message });
  }
};