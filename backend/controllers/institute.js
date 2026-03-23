import Institution from "../models/institute.js";
import sendEmail from "../configurations/nodemailer.js";
import Faculty from "../models/faculty.js";


export const getAllInstitutions= async(req , res) => {

    try{
      const names=await Institution.find({name});
   

       return res.status(200).json({
        status:true,
        data:names
       });
       
    }

    catch(err) {
        return res.status(500).json({
            status:false,
            message:err.message
        })
    }

};

//to generate random collage code
const generateCode = () => {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
};

 
const checkClgCode = async (code) => {
  if (!code) return false;
 
  const institute = await Institution.findOne({ code: code});
 
  return institute ? true : false;
};

// POST /api/institution/register
// Public — anyone can request institution registration
export const registerInstitutionRequest = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Institution name is required",
      });
    }

    // Check if institution name already exists or already pending
    const existing = await Institution.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An institution with this name already exists or is pending approval",
      });
    }

    // Send email to developer for manual verification
    await sendEmail(
      process.env.DEV_EMAIL,                          // developer's email from .env
      "New Institution Registration Request",
      `A new institution registration request has been submitted.\n\nInstitution Name: ${name.trim()}\nRequested by Faculty ID: ${req.user.id}\n\nPlease verify and approve in the database.`
    );
    
 const clg_code="";

 while(clg_code==="" || await checkClgCode(clg_code) ) {
    clg_code=generateCode();
 }

    // Save institution with status "pending" so dev can flip it to "approved"
    const institution = await Institution.create({
      name: name.trim(),
      registeredBy: req.user.id,
      superAdmin: req.user.id,
      code:clg_code,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Registration request sent. You will be notified once approved.",
      data: { code: clg_code, name: institution.name, status: institution.status },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/institution/details
// Protected — only the faculty who requested the institution can add details (after approval)
export const addInstitutionDetails = async (req, res) => {
  try {
    const {code, departments, address } = req.body;
    const facultyId = req.user.id;

    if (!code) {
      return res.status(400).json({ success: false, message: "institutionId is required" });
    }

    const institution = await Institution.findOne({code:code});

    if (!institution) {
      return res.status(404).json({ success: false, message: "Institution not found" });
    }

    // Only the faculty who registered it can add details
    if (institution.requestedBy.toString() !== facultyId) {
      return res.status(403).json({ success: false, message: "You are not authorized to edit this institution" });
    }

    // Must be approved by dev before details can be added
    if (institution.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Institution is not yet approved. Please wait for developer verification.",
      });
    }

    if (departments) institution.departments = departments;
    if (address) institution.address = address;

    await institution.save();

    return res.status(200).json({
      success: true,
      message: "Institution details updated successfully",
      data: institution,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};