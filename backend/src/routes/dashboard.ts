import express from 'express';
import { protect, authorize } from '../middleware/auth';
import Session from '../models/Session';
import Question from '../models/Question';

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// @route   GET /api/dashboard/teacher
// @desc    Get teacher dashboard data
router.get('/teacher', authorize('Teacher'), async (req, res) => {
    try {
        const userId = req.user?._id;

        // Count sessions created by this teacher
        const sessionsConducted = await Session.countDocuments({
            teacher: userId,
            isQuerySession: { $ne: true }
        });

        // Get total unique students from all sessions
        const sessions = await Session.find({ 
            teacher: userId,
            isQuerySession: { $ne: true }
        }).select('students');
        
        const uniqueStudents = new Set<string>();
        sessions.forEach(s => {
            s.students?.forEach(studentId => uniqueStudents.add(studentId.toString()));
        });

        // Count questions received across all sessions
        const sessionIds = sessions.map(s => s._id);
        const totalQuestions = await Question.countDocuments({
            session: { $in: sessionIds }
        });

        res.status(200).json({
            message: 'Welcome to your teaching dashboard!',
            role: 'teacher',
            metrics: {
                sessionsConducted,
                totalStudents: uniqueStudents.size,
                totalQuestions,
                totalAssignments: 0 // TODO: implement when assignments are ready
            },
            actions: ['create_session', 'view_sessions', 'manage_assignments']
        });
    } catch (error) {
        console.error('Teacher dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching dashboard data'
        });
    }
});

// @route   GET /api/dashboard/student
// @desc    Get student dashboard data
router.get('/student', authorize('Student'), async (req, res) => {
    try {
        const userId = req.user?._id;

        // Count sessions joined
        const sessionsJoined = await Session.countDocuments({
            students: userId
        });

        // Count questions asked
        const questionsAsked = await Question.countDocuments({
            user: userId
        });

        res.status(200).json({
            message: 'Welcome to your student dashboard!',
            role: 'student',
            metrics: {
                sessionsJoined,
                questionsAsked,
                assignmentsCompleted: 0 // TODO: implement
            },
            actions: ['join_session', 'view_history', 'view_assignments']
        });
    } catch (error) {
        console.error('Student dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching dashboard data'
        });
    }
});

export default router;
