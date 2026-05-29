import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true }
}, { timestamps: true });

// Ensure department code/name is unique within a college
departmentSchema.index({ collegeId: 1, code: 1 }, { unique: true });

export default mongoose.model("Department", departmentSchema);
