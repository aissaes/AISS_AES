import mongoose from "mongoose";

const uploadSchema=new mongoose.Schema({
    student:{type:mongoose.Schema.Types.ObjectId,
        ref:'Student'
    },
    exam:{type:mongoose.Schema.Types.ObjectId,
        ref:'Exam'
    },
    token:{type:String},
    expiresAt:{type:Date},
});

// Ensure a student only has one active upload session per exam
uploadSchema.index({ student: 1, exam: 1 }, { unique: true });
// Optimize token-based lookups
uploadSchema.index({ token: 1, student: 1 });

uploadSchema.index({expiresAt:1},{expireAfterSeconds:0}) //for automatically deleting the data after the expiresAt time is reached


const Upload=mongoose.model("Upload",uploadSchema);


export default Upload;  