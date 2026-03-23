import mongoose from "mongoose";

const institutionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },

  code: {
    type: String,
    unique: true,
  },

  

  address: {
    type: String
  },

  departments: [
    {
      name: {
        type: String,
        required: true
      }
    }
  ],

  superAdmins: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty"
    }
  ],

  status: {
    type: String,
    enum: ["active", "inactive", "pending"],
    default: "active"
  },

  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty"
  },
  isVerified:{
    type:Boolean,
    default:false
  }

}, { timestamps: true });

const Institution = mongoose.model("Institution", institutionSchema);

export default Institution;