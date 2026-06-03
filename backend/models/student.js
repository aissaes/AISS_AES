import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "College",
        required: true
    },
    semester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Semester",
        required: false
    },
    rollNumber: {
        type: String,
        required: true,
        unique: true
    },
    cgpa: {
        type: Number,
    },
    questionPapersAttempted: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuestionPaper"
    }],
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department"
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'Student'
    },
    otp: {
        type: String
    },
    otpExpires: {
        type: Date
    }
});

const Student = mongoose.model("Student", studentSchema);

export default Student;
