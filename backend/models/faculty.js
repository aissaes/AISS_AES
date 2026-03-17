import mongoose from "mongoose";

const facultySchema = new mongoose.Schema({

  name:{
    type:String,
    required:true
  },

  college:{
    type:String,
    required:true
  },

  department:{
    type:String,
    required:true
  },

  email:{
    type:String,
    required:true,
    unique:true
  },

  password:{
    type:String,
    required:true
  },

  phone:{
    type:String,
    required:true
  },

  // role system
  role:{
    type:String,
    enum:["faculty","hod","superAdmin"],
    default:"faculty"
  },

  // approval system
  isApproved:{
    type:Boolean,
    default:false
  },

  approvedBy:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Faculty"
  },

  // OTP for login
  otp:{
    type:String
  },

  otpExpires:{
    type:Date
  },

  questionPapersPrepared:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"QuestionPaper"
  }],
   
  pendingApprovals:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Faculty"
  }],

   acceptedApprovals:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Faculty"
  }],

    rejectedApprovals: [{
    name: String,
    email: String,
    department: String,
    rejectedReason: String,
    rejectedAt: {
      type: Date,
      default: Date.now
    }
  }],

  superAdminRole:{
    type:String,
    default:"Dean"
  }

});

const Faculty = mongoose.model("Faculty",facultySchema);

export default Faculty;