import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true, index: true },
  courseCode: { type: String, required: true }, // e.g., "CS301"
  courseName: { type: String, required: true }, // e.g., "Data Structures"
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
  credits: { type: Number, default: 3, required: true },
  status: { type: String, enum: ["Active", "Archived"], default: "Active" }
}, { timestamps: true });

// Ensure course code is unique within a college department
courseSchema.index({ collegeId: 1, department: 1, courseCode: 1 }, { unique: true });

export default mongoose.model("Course", courseSchema);
