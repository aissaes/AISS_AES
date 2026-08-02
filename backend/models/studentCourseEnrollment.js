import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
  academicYear: { type: String, required: true },
  status: { type: String, enum: ["Enrolled", "Completed", "Dropped"], default: "Enrolled" }
}, { timestamps: true });

// Avoid duplicate enrollment of same student in same course
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model("StudentCourseEnrollment", enrollmentSchema);
