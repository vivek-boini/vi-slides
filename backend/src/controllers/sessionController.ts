import { Request, Response } from 'express';
import Session from '../models/Session';
import Question from '../models/Question';
import { emitToSession } from '../config/socket';
import { generateMoodSummary } from '../services/aiService';
import QRCode from 'qrcode';
import os from 'os';

const getLocalUrl = (): string => {
    // 1. High priority: Explicit PUBLIC_URL (ngrok, tunnel, domain)
    if (process.env.PUBLIC_URL) {
        return process.env.PUBLIC_URL.replace(/\/$/, ''); // Remove trailing slash
    }

    // 2. Medium priority: FRONTEND_URL if it's not localhost
    const envUrl = process.env.FRONTEND_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl.replace(/\/$/, '');
    }

    // 3. Fallback: Detect Local Network IP (for same-WiFi usage)
    const interfaces = os.networkInterfaces();
    let detectedIp = '';

    for (const name of Object.keys(interfaces)) {
        const ifaceList = interfaces[name];
        if (!ifaceList) continue;

        for (const iface of ifaceList) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.internal || iface.family !== 'IPv4') continue;

            // Prioritize common private networks
            if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
                return `http://${iface.address}:5173`;
            }
            detectedIp = iface.address;
        }
    }

    if (detectedIp) {
        return `http://${detectedIp}:5173`;
    }

    // 4. Ultimate Fallback: Default Localhost
    return envUrl || 'http://localhost:5173';
};

// Helper to generate a unique 6-character code
const generateSessionCode = (length: number = 6): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

// @desc    Create a new session
// @route   POST /api/sessions
// @access  Private (Teacher only)
export const createSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description } = req.body;

        // Generate unique code
        let code = generateSessionCode();
        let codeExists = await Session.findOne({ code });

        // Ensure uniqueness
        while (codeExists) {
            code = generateSessionCode();
            codeExists = await Session.findOne({ code });
        }

        const session = await Session.create({
            title,
            description,
            code,
            teacher: req.user?._id,
            status: 'active'
        });

        const baseUrl = getLocalUrl();
        const joinUrl = `${baseUrl}/join/${code}`;
        try {
            const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#6366f1',
                    light: '#ffffff'
                }
            });
            session.qrCodeDataUrl = qrCodeDataUrl;
            session.joinUrl = joinUrl;
            await session.save();
        } catch (qrError) {
            console.error('QR code generation error:', qrError);
            // Continue even if QR generation fails
        }

        res.status(201).json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during session creation'
        });
    }
};

// @desc    Join a session
// @route   POST /api/sessions/join
// @access  Private (Student only)
export const joinSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.body;

        if (!code) {
            res.status(400).json({ success: false, message: 'Please provide a session code' });
            return;
        }

        const session = await Session.findOne({ code: code.toUpperCase(), status: 'active' });

        if (!session) {
            res.status(404).json({
                success: false,
                message: 'Active session not found with this code'
            });
            return;
        }

        // Add student to session if not already added
        const studentId = req.user?._id;
        if (studentId && !session.students.includes(studentId)) {
            session.students.push(studentId);
            await session.save();
        }

        res.status(200).json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error('Join session error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during joining session'
        });
    }
};

// @desc    Get session details by code
// @route   GET /api/sessions/:code
// @access  Private
export const getSessionDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.params;
        const session = await Session.findOne({ code: code.toUpperCase() })
            .populate('teacher', 'name email')
            .populate('students', 'name email');

        if (!session) {
            res.status(404).json({
                success: false,
                message: 'Session not found'
            });
            return;
        }

        if (session) {
            const baseUrl = getLocalUrl();
            // If the current detected base URL is public but the session's joinUrl is local/localhost,
            // refresh it so the QR code matches the current tunnel/domain.
            if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1') &&
                (!session.joinUrl || session.joinUrl.includes('localhost') || session.joinUrl.includes('127.0.0.1'))) {

                const joinUrl = session.isQuerySession ? `${baseUrl}/ask/${session.code}` : `${baseUrl}/join/${session.code}`;
                try {
                    const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, {
                        width: 300,
                        margin: 2,
                        color: { dark: '#6366f1', light: '#ffffff' }
                    });
                    session.qrCodeDataUrl = qrCodeDataUrl;
                    session.joinUrl = joinUrl;
                    await session.save();
                } catch (qrError) {
                    console.error('QR refresh error in getSessionDetails:', qrError);
                }
            }
        }

        res.status(200).json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching session'
        });
    }
};

// @desc    End a session
// @route   PATCH /api/sessions/:id/end
// @access  Private (Teacher only)
export const endSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const session = await Session.findById(req.params.id);

        if (!session) {
            res.status(404).json({ success: false, message: 'Session not found' });
            return;
        }

        // Check if user is the teacher of this session
        if (session.teacher.toString() !== req.user?._id.toString()) {
            res.status(403).json({ success: false, message: 'Unauthorized to end this session' });
            return;
        }

        session.status = 'ended';
        session.endedAt = new Date();

        // 1. Fetch all questions for this session to generate summary
        const questions = await Question.find({ session: session._id });
        const questionTexts = questions.map(q => q.content);

        // 2. Generate Mood Summary via AI (Gemini)
        // Note: This is an async call but we wait for it to store it in the session record
        session.moodSummary = await generateMoodSummary(questionTexts);

        await session.save();

        // Notify all participants
        emitToSession(session.code, 'session_status_update', { status: 'ended' });

        res.status(200).json({
            success: true,
            data: {
                _id: session._id,
                title: session.title,
                code: session.code,
                questionCount: questions.length,
                duration: Math.round((session.endedAt.getTime() - session.createdAt.getTime()) / 60000), // duration in minutes
                moodSummary: session.moodSummary
            },
            message: 'Session ended successfully'
        });
    } catch (error) {
        console.error('End session error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error ending session'
        });
    }
};

// @desc    Get session summary (for ended sessions)
// @route   GET /api/sessions/:code/summary
// @access  Private
export const getSessionSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.params;
        
        const session = await Session.findOne({ code: code.toUpperCase() })
            .populate('teacher', 'name email');
        
        if (!session) {
            res.status(404).json({ success: false, message: 'Session not found' });
            return;
        }
        
        // Fetch all questions for this session with user info
        const questions = await Question.find({ session: session._id })
            .populate('user', 'name email')
            .sort({ createdAt: 1 });
        
        // Count unique students (exclude teacher)
        const teacherId = session.teacher._id?.toString() || session.teacher.toString();
        const uniqueStudentIds = new Set<string>();
        
        session.attendance.forEach(record => {
            const studentId = record.student?.toString();
            if (studentId && studentId !== teacherId) {
                uniqueStudentIds.add(studentId);
            }
        });
        
        // Also count from students array
        session.students.forEach(studentId => {
            const id = studentId.toString();
            if (id !== teacherId) {
                uniqueStudentIds.add(id);
            }
        });
        
        const totalStudents = uniqueStudentIds.size;
        
        // Format questions for response
        // After populate, user is an object with name/email, not ObjectId
        const formattedQuestions = questions.map(q => {
            const populatedUser = q.user as unknown as { name?: string; email?: string } | undefined;
            return {
                _id: q._id,
                text: q.content,
                answer: q.teacherAnswer || null,
                studentName: populatedUser?.name || q.guestName || 'Anonymous',
                createdAt: q.createdAt
            };
        });
        
        res.status(200).json({
            success: true,
            data: {
                sessionCode: session.code,
                title: session.title,
                description: session.description,
                status: session.status,
                totalStudents,
                totalQuestions: questions.length,
                questions: formattedQuestions,
                moodSummary: session.moodSummary,
                createdAt: session.createdAt,
                endedAt: session.endedAt
            }
        });
    } catch (error) {
        console.error('Get session summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching session summary'
        });
    }
};

// @desc    Pause or Resume a session
// @route   PATCH /api/sessions/:id/pause
// @access  Private (Teacher only)
export const pauseSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const session = await Session.findById(req.params.id);

        if (!session) {
            res.status(404).json({ success: false, message: 'Session not found' });
            return;
        }

        // Check if user is the teacher of this session
        if (session.teacher.toString() !== req.user?._id.toString()) {
            res.status(403).json({ success: false, message: 'Unauthorized to control this session' });
            return;
        }

        // Toggle status
        const newStatus = session.status === 'paused' ? 'active' : 'paused';
        session.status = newStatus;
        await session.save();

        // Notify all participants
        emitToSession(session.code, 'session_status_update', { status: newStatus });

        res.status(200).json({
            success: true,
            status: newStatus,
            message: `Session ${newStatus === 'paused' ? 'paused' : 'resumed'} successfully`
        });
    } catch (error) {
        console.error('Pause session error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error toggling session pause'
        });
    }
};

// @desc    Leave a session
// @route   POST /api/sessions/:code/leave
// @access  Private
export const leaveSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.params;
        const session = await Session.findOne({ code: code.toUpperCase() });

        if (!session) {
            res.status(404).json({ success: false, message: 'Session not found' });
            return;
        }

        const userId = req.user?._id;
        if (userId) {
            // Remove user from students array
            session.students = session.students.filter(id => id.toString() !== userId.toString()) as any;
            await session.save();
        }

        res.status(200).json({
            success: true,
            message: 'Left session successfully'
        });
    } catch (error) {
        console.error('Leave session error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error leaving session'
        });
    }
};

// @desc    Get all sessions for a teacher
// @route   GET /api/sessions/teacher/list
// @access  Private (Teacher only)
export const getTeacherSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;

        const sessions = await Session.find({
            teacher: userId,
            isQuerySession: { $ne: true } // Exclude query sessions
        })
            .sort({ createdAt: -1 })
            .select('title description code status createdAt students');

        // Transform to include student count
        const sessionsWithCount = sessions.map(session => ({
            id: session._id,
            code: session.code,
            title: session.title,
            description: session.description || '',
            createdAt: session.createdAt,
            status: session.status,
            studentsJoined: session.students?.length || 0
        }));

        res.status(200).json({
            success: true,
            sessions: sessionsWithCount
        });
    } catch (error) {
        console.error('Get teacher sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching teacher sessions'
        });
    }
};

// @desc    Get active session for user
// @route   GET /api/sessions/current/active
// @access  Private
export const getActiveSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;
        let session;

        if (req.user?.role === 'Teacher') {
            session = await Session.findOne({ teacher: userId, status: { $in: ['active', 'paused'] } });
        } else {
            session = await Session.findOne({ students: userId, status: { $in: ['active', 'paused'] } });
        }

        res.status(200).json({
            success: true,
            data: session || null
        });
    } catch (error) {
        console.error('Get active session error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching active session'
        });
    }
};

// @desc    Get all sessions a student has joined (for certificates)
// @route   GET /api/sessions/student/history
// @access  Private
export const getStudentSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;

        // Find sessions where student is in participants list
        const sessions = await Session.find({
            students: userId
        })
            .populate('teacher', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('Get student sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching student sessions'
        });
    }
};
// @desc    Get or create a teacher's persistent query session
// @route   GET /api/sessions/query-mode
// @access  Private (Teacher only)
export const getOrCreateQuerySession = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;

        // Find existing query session for this teacher
        let session = await Session.findOne({ teacher: userId, isQuerySession: true });

        const baseUrl = getLocalUrl();

        // If session exists but has localhost URL, refresh it
        if (session && session.joinUrl?.includes('localhost') && !baseUrl.includes('localhost')) {
            const askUrl = `${baseUrl}/ask/${session.code}`;
            const qrCodeDataUrl = await QRCode.toDataURL(askUrl, {
                width: 300,
                margin: 2,
                color: { dark: '#6366f1', light: '#ffffff' }
            });
            session.qrCodeDataUrl = qrCodeDataUrl;
            session.joinUrl = askUrl;
            await session.save();
        }

        if (!session) {
            // Create a new persistent query session
            let code = generateSessionCode();
            let codeExists = await Session.findOne({ code });

            while (codeExists) {
                code = generateSessionCode();
                codeExists = await Session.findOne({ code });
            }

            session = await Session.create({
                title: `${req.user?.name}'s Query Mode`,
                code,
                teacher: userId,
                status: 'active',
                isQuerySession: true
            });

            const askUrl = `${baseUrl}/ask/${code}`;
            const qrCodeDataUrl = await QRCode.toDataURL(askUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#6366f1',
                    light: '#ffffff'
                }
            });

            session.qrCodeDataUrl = qrCodeDataUrl;
            session.joinUrl = askUrl;
            await session.save();
        }

        res.status(200).json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error('Get/Create query session error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error handling query session'
        });
    }
};

// @desc    Update custom query URL
// @route   PATCH /api/sessions/query-mode/url
// @access  Private (Teacher only)
export const updateQueryUrl = async (req: Request, res: Response): Promise<void> => {
    try {
        const { url } = req.body;
        const userId = req.user?._id;

        const session = await Session.findOne({ teacher: userId, isQuerySession: true });

        if (!session) {
            res.status(404).json({ success: false, message: 'Query session not found' });
            return;
        }

        session.customQueryUrl = url;
        await session.save();

        res.status(200).json({
            success: true,
            data: session,
            message: 'Query URL updated successfully'
        });
    } catch (error) {
        console.error('Update query URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating query URL'
        });
    }
};
