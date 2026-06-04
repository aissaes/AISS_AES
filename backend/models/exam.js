import mongoose from "mongoose";

const examSchema = new mongoose.Schema({
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
  semesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Semester",
    required: true,
    index: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: false,
    index: true
  },
  subjectName: {
    type: String,
    required: true
  },
  subjectCode: {
    type: String,
    required: true
  },
  examType: {
    type: String,
    enum: [
      "Mid Semester Examination",
      "End Semester Examination",
      "Special Mid Semester Examination",
      "Special End Semester Examination"
    ],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  maxMarks: {
    type: Number,
    required: true
  },
  token: {
    type: String,
    default: "Not generated"
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  isPaperQuestionUploaded: {
    type: Boolean,
    default: false
  },
  assignedFaculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    required: true,
    index: true
  },
  questionPaper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QuestionPaper",
    default: null
  },
  qrCode: {
    type: String,
    default: null
  },
  noOfStudentsRegistered: {
    type: Number,
  },
  studentsRegistered: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    }
  ],
  resultsPublished: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Optimize lookups by exam token
examSchema.index({ token: 1 });

const Exam = mongoose.model("Exam", examSchema);

export default Exam;