import mongoose from "mongoose";
import env from "./env";

export const connectDatabase = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.log("Error connecting to MongoDB");
    if (error instanceof Error) {
      console.error("MongoDB connection error details:", error.message, error.stack);
    } else {
      console.error("MongoDB connection error (non-Error value):", error);
    }
    process.exit(1);
  }
};