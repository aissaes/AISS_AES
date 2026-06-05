import mongoose from "mongoose";

const teacherMaterialSchema = new mongoose.Schema({
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
    index: true
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    default: null,
    index: true
  },
  materialType: {
    type: String,
    enum: ["notes", "answer_key", "syllabus", "rubric"],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  imageKitUrl: {
    type: String,
    required: true
  },
  imageKitFileId: {
    type: String,
    required: true
  },
  questionId: {
    type: String,
    default: null
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    required: true,
    index: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const TeacherMaterial = mongoose.model("TeacherMaterial", teacherMaterialSchema);

export default TeacherMaterial;
