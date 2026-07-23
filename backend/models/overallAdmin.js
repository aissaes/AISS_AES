import mongoose from "mongoose";

const overallAdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
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
  otp: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  },
  otpAttempts: {
    type: Number,
    default: 0
  },
  refreshToken: {
    type: String,
    default: null
  }
}, { timestamps: true });

const OverallAdmin = mongoose.model("OverallAdmin", overallAdminSchema);
export default OverallAdmin;