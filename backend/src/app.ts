import express from "express";
import cors from "cors";
import morgan from "morgan";
import env from "./config/env";
import authRouter from "./routes/auth.routes";
import dashboardRouter from "./routes/dashboard.routes";

const app = express();

// middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// test route
app.get("/api/health", (req, res) => {
  res.json({ message: "API is running" });
});

// routes
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;