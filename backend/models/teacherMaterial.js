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
  scope: {
    type: String,
    enum: ["entire_exam", "question"],
    default: null
  },
  version: {
    type: Number,
    default: 1
  },
  parentMaterialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TeacherMaterial",
    default: null,
    index: true
  },
  isActiveVersion: {
    type: Boolean,
    default: true,
    index: true
  },
  chunkCount: {
    type: Number,
    default: 0
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
  },
  status: {
    type: String,
    enum: ["pending", "active", "failed"],
    default: "pending",
    index: true
  }
}, { timestamps: true });

const TeacherMaterial = mongoose.model("TeacherMaterial", teacherMaterialSchema);

export default TeacherMaterial;
