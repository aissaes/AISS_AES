import Faculty from "../../models/faculty.js";

// 1. Transfer HOD (Current HOD hands over power to another faculty member)
export const transferHOD = async (req, res) => {
  try {
    const { newHODId } = req.body; // ID of the person becoming the HOD sent from frontend
    const currentHODId = req.user.id; // Grab the current HOD from the token

    // Find the person getting promoted
    const newHOD = await Faculty.findById(newHODId);
    if (!newHOD) {
      return res.status(404).json({ message: "Target faculty member not found" });
    }

    // Ensure they are in the same department
    const currentHOD = await Faculty.findById(currentHODId);
    if (newHOD.department !== currentHOD.department) {
      return res.status(400).json({ message: "You can only transfer the role to someone in your own department." });
    }

    // Demote the current HOD
    currentHOD.role = "faculty";
    await currentHOD.save();

    // Promote the new person
    newHOD.role = "hod";
    await newHOD.save();

    res.status(200).json({ 
      message: `You have successfully transferred the HOD role to ${newHOD.name}. You are now standard faculty.` 
    });

  } catch (error) {
    console.error("Error transferring HOD:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};