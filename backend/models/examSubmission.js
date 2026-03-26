import mongoose from "mongoose";

const examSubmissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'uploaded', 'failed'],
    default: 'uploaded'
  },
  clientIp: {
    type: String
  }
}, { timestamps: true });

// Ensure a student can only have one submission per exam
examSubmissionSchema.index({ student: 1, exam: 1 }, { unique: true });

const ExamSubmission = mongoose.model("ExamSubmission", examSubmissionSchema);

export default ExamSubmission;
