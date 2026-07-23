import mongoose from "mongoose";

const answerFileSchema = new mongoose.Schema({
  fileUrl: { type: String, required: true },
  fileType: { type: String, required: true, enum: ["image", "pdf", "unknown"] },
  mimeType: { type: String, required: true },
  originalFileName: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, required: true, default: Date.now },
  imageKitFileId: { type: String, required: false }
}, { _id: false });

const answersSchema = new mongoose.Schema({
  uploaded_student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  for_exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
  },
  answers: {
    type: Map,
    of: answerFileSchema,
  },
  isLockedForEvaluation: {
    type: Boolean,
    default: false
  },
  isSubmitted: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: null
  }
});

// 1 student per exam
answersSchema.index(
  { uploaded_student: 1, for_exam: 1 },
  { unique: true }
);

const Answers = mongoose.model("Answers", answersSchema);

export default Answers;