import mongoose from "mongoose";

const collegeSchema = new mongoose.Schema({
  collegeName: {
    type: String,
    required: true,
    unique: true
  },
  collegeCode: {
    type: String,
    required: false
  },
  location: {
    type: String
  },
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department"
  }],
  collegeAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty" // Links to the person running this specific college
  },
  status: { 
    type: String, 
    enum: ["Pending", "Approved"], 
    default: "Pending" 
  },
}, { timestamps: true });

const College = mongoose.model("College", collegeSchema);
export default College;