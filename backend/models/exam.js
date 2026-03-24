import mongoose from "mongoose";

const examSchema = new mongoose.Schema({

  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: true,
    index: true
  },
  
  department: {
    type: String,
    required: true,
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

  course: {
    type: String,
    required: true
  },

  semester: {
    type: Number,
    required: true
  },

  examType: {
    type: String,
    enum: [
      "Mid Semester Examination",
      "End Semester Examination",
      "Special Mid Semester Examination",
      "Special End Semester Examination"
    ]
  },

  date: {
    type: Date,
    required: true
  },

  maxMarks: {
    type: Number,
    required: true
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
  }

}, { timestamps: true }); // Automatically handles createdAt and updatedAt

const Exam = mongoose.model("Exam", examSchema);

export default Exam;


// {
//   "_id": "6641a2...",
//   "collegeId": "665c2b...",
//   "department": "Computer Science",
//   "subjectName": "Cryptography and Network Security",
//   "subjectCode": "CS502",
//   "course": "B.Tech",
//   "semester": 5,
//   "examType": "Mid Semester Examination",
//   "date": "2026-03-20T00:00:00.000Z",
//   "maxMarks": 30,

//   "startTime": "2026-03-20T09:00:00.000Z",
//   "endTime": "2026-03-20T11:00:00.000Z",
//   "questionPaper": "664abc123...",
//   "isPaperQuestionUploaded": false,
//   "assignedFaculty": "664def456..."
// }