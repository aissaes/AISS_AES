import mongoose from "mongoose";

const collegeSchema = new mongoose.Schema({
  collegeName: {
    type: String,
    required: true,
    unique: true
  },
  location: {
    type: String
  },
  departments: [{
    type: String // e.g., ["Computer Science", "Mechanical", "Civil"]
  }],
  collegeAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty" // Links to the person running this specific college
  }
}, { timestamps: true });

const College = mongoose.model("College", collegeSchema);
export default College;