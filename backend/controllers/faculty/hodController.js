import Faculty from "../../models/faculty.js";
import sendEmail from "../../configurations/nodemailer.js";

// 1. Transfer HOD (Current HOD hands over power to another faculty member)
export const transferHOD = async (req, res) => {
  try {
    const { newHODId } = req.body; 
    const currentHODId = req.user.id; 

    // 1. Find the person getting promoted
    const newHOD = await Faculty.findById(newHODId);
    if (!newHOD) {
      return res.status(404).json({ message: "Target faculty member not found" });
    }

    // 2. Ensure they are in the same college AND department
    const currentHOD = await Faculty.findById(currentHODId);
    if (newHOD.collegeId.toString() !== currentHOD.collegeId.toString() || newHOD.department !== currentHOD.department) {
      return res.status(403).json({ message: "You can only transfer the role to someone in your own college and department." });
    }

    // 3. Demote the current HOD
    currentHOD.role = "faculty";
    await currentHOD.save();

    // 4. Promote the new person
    newHOD.role = "hod";
    await newHOD.save();

    // --- 5. NEW EMAIL NOTIFICATION BLOCK ---
    const subject = "Transfer of Head of Department (HOD) Role - AISS Platform";
    const body = `Dear ${newHOD.name},\n\nThe Head of Department (HOD) role for the ${newHOD.department} department has been officially transferred to you.\n\nYou now have full access to the HOD Dashboard to manage timetables, assign faculty, and review question papers.\n\nRegards,\nCollege Administration`;

    await sendEmail(newHOD.email, subject, body).catch(err => {
      console.error("Failed to send HOD transfer email:", err);
    });

    res.status(200).json({ 
      message: `You have successfully transferred the HOD role to ${newHOD.name}. You are now standard faculty.` 
    });

  } catch (error) {
    console.error("Error transferring HOD:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};