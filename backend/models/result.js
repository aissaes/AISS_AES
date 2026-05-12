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
    marksObtained: {
        type: Number,
        required: true
    },
    totalMarks: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Result = mongoose.model("Result", resultSchema);

export default Result;
