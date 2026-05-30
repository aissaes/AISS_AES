import mongoose from "mongoose";

const questionResultSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  aiMarks: {
    type: Number,
    required: true
  },
  aiReasoning: { // explanation or reason for alloted marks
    type: String,
    required: true 
  },
  strengths: { 
    type: String,
    required: true 
  },
  weakness: {
    type: String,
    required: true 
  },
  aiFeedback: {
    type: String,
    default: "" // Constructive feedback for the student to improve
  },
  overrideMarks: {
    type: Number,
    default: null // Null means the teacher hasn't overridden it
  },
  overrideReason: {
    type: String,
    default: null // Why the teacher changed the AI's grade
  }
}, { _id: false });

const resultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
    index: true
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
    index: true
  },
  questionPaper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QuestionPaper",
    required: true
  },
  
  // Array holding the breakdown for every single question
  evaluations: [questionResultSchema], 
  
  // The sum of all marks (AI or Overridden)
  totalMarksObtained: {
    type: Number,
    default: 0
  },
  
  // To let the frontend know if it's safe to view
  status: {
    type: String,
    enum: ["Evaluating", "Completed", "Failed"],
    default: "Evaluating"
  }
}, { timestamps: true });

// Ensure a student only has one result document per exam
resultSchema.index({ student: 1, exam: 1 }, { unique: true });

const Result = mongoose.model("Result", resultSchema);

export default Result;