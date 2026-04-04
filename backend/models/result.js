import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    questionPaper: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuestionPaper",
        required: true
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exam",
        required: true
    },
    marksObtained: {
        type: Number,
        required: true
    },
    totalMarks: {
        type: Number,
        required: true
    },
    isManuallyEvaluated: {
        type: Boolean,
        default: false // Flips to true if the teacher overrides the AI
    },
    facultyFeedback: {
        type: String,
        default: ""
    },
    breakdown: [{
            questionId: String,
            studentAnswerText: String,
            aiMarks: Number,
            facultyMarks: { type: Number, default: null }, 
            maxMarks: Number,
            aiFeedback: String,
            facultyFeedback: { type: String, default: "" }, // 👈 ADDED THIS HERE
            retrievedReference: String
    }],
    date: {
        type: Date,
        default: Date.now
    }
});

const Result = mongoose.model("Result", resultSchema);
export default Result;