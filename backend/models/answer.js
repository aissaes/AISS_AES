import mongoose from "mongoose";

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
    of: String, // correct
  },
});

// 1 student per exam
answersSchema.index(
  { uploaded_student: 1, for_exam: 1 },
  { unique: true }
);

const Answers = mongoose.model("Answers", answersSchema);

export default Answers;