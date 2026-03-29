import mongoose from "mongoose";
import env from "./env";

export const connectDatabase = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.log("Error connecting to MongoDB");
    process.exit(1);
  }
};