import mongoose from "mongoose";

const uploadSchema=new mongoose.Schema({
    student:{type:mongoose.Schema.Types.ObjectId,
        ref:'Student'
    },
    exam:{type:mongoose.Schema.Types.ObjectId,
        ref:'Exam'
    },
    token:{type:String},
    expiresId:{type:Date},
});

uploadSchema.index({expiresId:1},{expireAfterSeconds:0}) //for automatically deleting the data after the expiresAt time is reached


const Upload=mongoose.model("Upload",uploadSchema);


export default Upload;