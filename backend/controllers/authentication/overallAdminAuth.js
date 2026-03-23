import OverallAdmin from "../../models/overallAdmin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../../configurations/nodemailer.js";

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
    await admin.save();

    await sendEmail(
      admin.email,
      "AISS Platform - Admin Login OTP",
      `Hello ${admin.name},
      
       Your master admin login OTP is: ${otp}
       
       This is valid for 5 minutes. Do not share this with anyone.`
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

    if (admin.otp !== otp || admin.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // Clear OTP
    admin.otp = null;
    admin.otpExpires = null;
    await admin.save();

    // Create a highly privileged JWT
    const token = jwt.sign(
      { id: admin._id, role: "overallAdmin" }, // Distinct role!
      process.env.JWT_SECRET,
      { expiresIn: "1d" } // Shorter expiry for high-security accounts
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({ 
      message: "Platform login successful.",
      role: "overallAdmin"
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const logoutOverallAdmin = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).json({ message: "Overall Admin logged out successfully" });
};