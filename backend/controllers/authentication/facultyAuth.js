import sendEmail from "../../configurations/nodemailer.js";
import Faculty from "../../models/faculty.js";
import College from "../../models/college.js";
import Department from "../../models/department.js";
import Course from "../../models/course.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

export const registerFaculty = async (req, res) => {
  try {
    const { name, email, password, collegeId, department, course, phone } = req.body;

    // 1. Check if email already exists for a cleaner error message
    const existingFaculty = await Faculty.findOne({ email });
    if (existingFaculty) {
      return res.status(400).json({ message: "Email is already registered" });
    }
    // NEW: Fetch the College to make sure it exists and to get its real name for emails!
    const collegeDoc = await College.findById(collegeId);
    if (!collegeDoc) {
      return res.status(404).json({ message: "Selected college does not exist." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Dynamically resolve department name string to an ObjectId and keep a readable name for emails
    let deptId = department;
    let deptName = department;
    if (department) {
      if (mongoose.Types.ObjectId.isValid(department)) {
        const deptDoc = await Department.findById(department);
        if (deptDoc) {
          deptName = deptDoc.name;
        }
      } else {
        let deptDoc = await Department.findOne({ collegeId, name: department });
        if (!deptDoc) {
          const deptCode = department.substring(0, 5).toUpperCase();
          deptDoc = new Department({ collegeId, name: department, code: deptCode });
          await deptDoc.save();
        }
        deptId = deptDoc._id;
        deptName = deptDoc.name;
      }
    }

    // Dynamically resolve course input to an ObjectId and keep a readable name for emails
    let resolvedCourseId = null;
    let courseName = course || "Not assigned";
    if (course) {
      if (mongoose.Types.ObjectId.isValid(course)) {
        const courseDoc = await Course.findById(course);
        if (courseDoc) {
          resolvedCourseId = courseDoc._id;
          courseName = `${courseDoc.courseCode} - ${courseDoc.courseName}`;
        }
      } else {
        const courseDoc = await Course.findOne({
          collegeId,
          $or: [{ courseCode: course }, { courseName: course }]
        });
        if (courseDoc) {
          resolvedCourseId = courseDoc._id;
          courseName = `${courseDoc.courseCode} - ${courseDoc.courseName}`;
        }
      }
    }

    const faculty = await Faculty.create({
      name,
      email,
      password: hashedPassword,
      collegeId: new mongoose.Types.ObjectId(collegeId),
      department: deptId,
      course: resolvedCourseId,
      phone
    });

    const detailsGrid = [
      { label: 'Applicant Name', value: faculty.name },
      { label: 'Email Address', value: faculty.email },
      { label: 'College', value: collegeDoc?.collegeName || 'N/A' },
      { label: 'Department', value: deptName },
      { label: 'Assigned Course', value: courseName },
      { label: 'Phone Number', value: faculty.phone || 'Not provided' }
    ];

    // 2. Route approval to HOD if assigned, fallback to College Admin
    const authority = (await Faculty.findOne({ collegeId, department: deptId, role: "hod" }))
                   || (await Faculty.findOne({ collegeId, role: "collegeAdmin" }));

    if (authority) {
      authority.pendingApprovals.push(faculty._id);
      await authority.save();

      const isHOD = authority.role === "hod";
      const htmlContent = generateRegistrationDetailsTemplate({
        recipientName: authority.name,
        title: isHOD ? "New Faculty Registration Request" : "Faculty Approval Required (No HOD Assigned)",
        subtitle: isHOD 
          ? "A new faculty member has submitted a registration request and is awaiting your review."
          : "A new faculty registration has been received for a department without an assigned HOD.",
        badgeText: isHOD ? "HOD Approval Required" : "Admin Approval Required",
        badgeColor: isHOD ? "#f59e0b" : "#ea580c",
        details: detailsGrid,
        footerNote: isHOD 
          ? "Please review and approve or reject this request from your HOD Dashboard."
          : "Since no HOD is assigned to this department, please review and approve or reject this registration from your Admin Dashboard."
      });

      await sendEmail(
        authority.email,
        isHOD ? "New Faculty Registration Request - AISS AES" : "Faculty Approval Required (No HOD Assigned) - AISS AES",
        `New registration request from ${faculty.name} awaiting your approval.`,
        htmlContent
      );
    } else {
      console.warn(`[Registration] No HOD or College Admin found for collegeId: ${collegeId}`);
    }

    // 3. Send confirmation email to applicant
    const recipientHtml = generateRegistrationDetailsTemplate({
      recipientName: faculty.name,
      title: "Registration Request Received",
      subtitle: "We have successfully received your registration request for the AISS AES platform. Your account is currently PENDING approval by your College Administration.",
      badgeText: "Pending Approval",
      badgeColor: "#3b82f6",
      details: detailsGrid,
      footerNote: "You will receive another email notification once your account has been approved and activated."
    });

    await sendEmail(
      faculty.email,
      "Registration Request Received - AISS AES",
      "Your registration request has been received and is pending approval.",
      recipientHtml
    );

    res.json({
      message: "Registration request sent for approval"
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Internal server error", error: err });
  }
};

export const loginFaculty = async(req,res)=>{
  try{

    const {email,password} = req.body;

    const faculty = await Faculty.findOne({email});

    if(!faculty)
      return res.status(400).json({message:"User not found"});

    if(!faculty.isApproved)
    return res.status(403).json({message:"Faculty not approved yet"});

    const match = await bcrypt.compare(password,faculty.password);

    if(!match)
      return res.status(400).json({message:"Invalid password"});

   // const otp = Math.floor(100000 + Math.random()*900000).toString();
   const otp = "123456";

    faculty.otp = otp;
    faculty.otpExpires = Date.now() + 5*60*1000;

    await faculty.save();

    await sendEmail(email,"Login OTP",
        `Dear Faculty,
        Your One-Time Password (OTP) for login is: ${otp}
        This OTP is valid for 5 minutes. Please do not share it with anyone.
        If you did not request this, please ignore this email.
        Regards,
        AI Exam Evaluation System`);
    res.json({message:"OTP sent to email"});

  }catch(err){
    res.status(500).json(err);
  }
};

export const verifyOTP = async(req,res)=>{
  try{

    const {email,otp} = req.body;

    const faculty = await Faculty.findOne({email});

    if(!faculty)
      return res.status(400).json({message:"User not found"});

    if(faculty.otp !== otp || faculty.otpExpires < Date.now())
      return res.status(400).json({message:"Invalid OTP"});

    faculty.otp = null;
    faculty.otpExpires = null;

    await faculty.save();

    // 1. Access Token (6 hours)
    const token = jwt.sign(
      { id: faculty._id, role: faculty.role },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );

    // 2. Refresh Token (7 days)
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || (process.env.JWT_SECRET + "_refresh");
    const refreshToken = jwt.sign(
      { id: faculty._id, role: faculty.role },
      refreshTokenSecret,
      { expiresIn: "7d" }
    );

    // 3. Store Refresh Token in DB for instant revocation
    faculty.refreshToken = refreshToken;
    await faculty.save();

    // ✅ Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,     // cannot be accessed by JS
      secure: true,       // required for SameSite=None
      sameSite: "none",   // required for cross-domain cookies
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,     // cannot be accessed by JS
      secure: true,       // required for SameSite=None
      sameSite: "none",   // required for cross-domain cookies
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: "Login successful",
      role: faculty.role,
      token,
      refreshToken
    });

  }
  catch (err) {
    console.error(" CRASH IN VERIFY OTP:", err); // This forces it to print in the terminal!
    res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};

export const logoutFaculty = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (refreshToken) {
      const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || (process.env.JWT_SECRET + "_refresh");
      try {
        const decoded = jwt.verify(refreshToken, refreshTokenSecret);
        await Faculty.findByIdAndUpdate(decoded.id, { refreshToken: null });
      } catch (e) {}
    }
  } catch (e) {}

  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.status(200).json({ message: "Logged out successfully" });
};

export const refreshFacultyToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh Token is required" });
    }

    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || (process.env.JWT_SECRET + "_refresh");
    const decoded = jwt.verify(refreshToken, refreshTokenSecret);

    const faculty = await Faculty.findById(decoded.id);
    if (!faculty || faculty.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid or revoked Refresh Token. Please log in again." });
    }

    // ROTATION: Issue NEW 6-hour Access Token & NEW 7-day Refresh Token
    const newToken = jwt.sign(
      { id: faculty._id, role: faculty.role },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );

    const newRefreshToken = jwt.sign(
      { id: faculty._id, role: faculty.role },
      refreshTokenSecret,
      { expiresIn: "7d" }
    );

    // Update DB with rotated Refresh Token
    faculty.refreshToken = newRefreshToken;
    await faculty.save();

    res.cookie("token", newToken, {
      httpOnly: true,     // cannot be accessed by JS
      secure: true,       // required for SameSite=None
      sameSite: "none",   // required for cross-domain cookies
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,     // cannot be accessed by JS
      secure: true,       // required for SameSite=None
      sameSite: "none",   // required for cross-domain cookies
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({ token: newToken, refreshToken: newRefreshToken, message: "Token refreshed and rotated successfully" });
  } catch (err) {
    return res.status(403).json({ message: "Expired or invalid Refresh Token", error: err.message });
  }
};
