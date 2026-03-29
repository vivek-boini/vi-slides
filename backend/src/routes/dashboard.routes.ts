import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

const dashboardRouter = Router();

dashboardRouter.get("/teacher", requireAuth, requireRole("teacher"), (req, res) => {
    res.status(200).json({
        message: `Welcome back, ${req.user?.name}`,
        role: "teacher",
        metrics: {
            activeSessions: 3,
            sessionsConducted: 18,
            totalStudents: 124
        },
        actions: ["Create Session", "Review Questions", "Publish Materials"]
    });
});

dashboardRouter.get("/student", requireAuth, requireRole("student"), (req, res) => {
    res.status(200).json({
        message: `Welcome back, ${req.user?.name}`,
        role: "student",
        metrics: {
            sessionsJoined: 9,
            questionsAsked: 31,
            pendingResponses: 4
        },
        actions: ["Join Session", "Ask Question", "Track Progress"]
    });
});

export default dashboardRouter;
