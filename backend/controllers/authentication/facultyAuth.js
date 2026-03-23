import sendEmail from "../../configurations/nodemailer.js";
import Faculty from "../../models/faculty.js";
import College from "../../models/college.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerFaculty = async (req, res) => {
  try {
    const { name, email, password, collegeId, department, phone } = req.body;

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

    const faculty = await Faculty.create({
      name,
      email,
      password: hashedPassword,
      collegeId,
      department,
      phone
    });

    // 2. Route the approval to the correct authority
    const hod = await Faculty.findOne({
      collegeId,
      department,
      role: "hod"
    });

    if (hod) {
      hod.pendingApprovals.push(faculty._id);
      await hod.save();
      await sendEmail(hod.email,"New Faculty Registration Request",
        `Dear ${hod.name},
        A new faculty member has submitted a registration request and is awaiting your approval.

        Faculty Details:
        - Name: ${faculty.name}
        - Email: ${faculty.email}
        - Department: ${faculty.department}
        - College: ${collegeDoc.collegeName}
        - Phone: ${faculty.phone}

        Please review and approve or reject this request from your dashboard.

        Regards,
        AISS Team`
        );
    } else {
      const collegeAdmin = await Faculty.findOne({
        collegeId,
        role: "collegeAdmin"
      });

      // 3. Safety check and pushing to collegeAdmin's pending list
      if (collegeAdmin) {
        collegeAdmin.pendingApprovals.push(faculty._id);
        await collegeAdmin.save();
        await sendEmail(collegeAdmin.email,"Faculty Approval Required (No HOD Assigned)",
              `Dear ${collegeAdmin.name},

            A new faculty registration has been received for a department without an assigned HOD.

            Faculty Details:
            - Name: ${faculty.name}
            - Email: ${faculty.email}
            - Department: ${faculty.department}
            - College: ${collegeDoc.collegeName}
            - Phone: ${faculty.phone}

            Since no HOD is assigned, you are requested to review and approve or reject this registration.

            Regards,
            AISS Team`
            );
      } else {
        console.warn(`No College Admin or HOD found for college: ${collegeId}`);
        // Optionally, handle what happens if a college has zero admins yet.
      }
    }

    await sendEmail(
      faculty.email,
      "Registration Request Received - AISS",
      `Dear ${faculty.name},
      \n\nWe have successfully received your registration request for the AISS platform.
      \n\nYour account is currently PENDING approval by your College Administration.
       You will receive another email once your account is activated.
       \n\nHere are the details you submitted:
       \n- Name: ${faculty.name}\n- College: ${collegeDoc.collegeName}\n- Department: ${faculty.department}\n- Phone: ${faculty.phone}
       \n\nIf any of these details are incorrect, please contact your administration.\n\nBest Regards,\nThe AISS Team`
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

    const otp = Math.floor(100000 + Math.random()*900000).toString();

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

    // JWT creation
    const token = jwt.sign(
      {
        id: faculty._id,
        role: faculty.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,     // cannot be accessed by JS
      secure: process.env.NODE_ENV === "production", // only HTTPS in production
      sameSite: "strict", // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: "Login successful",
      role: faculty.role 
    });

  }
    catch(err) {
    console.error(" CRASH IN VERIFY OTP:", err); // This forces it to print in the terminal!
    res.status(500).json({ 
      message: "Internal server error", 
      error: err.message 
    });
  }
};

export const logoutFaculty = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).json({ message: "Logged out successfully" });
};
