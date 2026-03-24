import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
  try {
    if (isConnected) {
      // ✅ already connected, reuse
      return;
    }

    const db = await mongoose.connect(process.env.MONGO_URI);

    isConnected = db.connections[0].readyState;
    console.log("MongoDB connected");

  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error; // 🔥 important for debugging
  }
};

export default connectDB;
