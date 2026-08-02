import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  academicYear: { type: String, required: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
}, { timestamps: true });

// Avoid duplicate assignment
assignmentSchema.index({ faculty: 1, course: 1 }, { unique: true });

export default mongoose.model("FacultyCourseAssignment", assignmentSchema);
