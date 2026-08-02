import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema({
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true, index: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  semesterNumber: { type: Number, required: true }, // e.g. 1 to 8
  semesterName: { type: String, required: true }, // e.g. "Semester 5"
  academicYear: { type: String, required: true }, // e.g. "2026-2027"
  status: { type: String, enum: ["Active", "Inactive", "Archived"], default: "Active", index: true }
}, { timestamps: true });

export default mongoose.model("Semester", semesterSchema);
