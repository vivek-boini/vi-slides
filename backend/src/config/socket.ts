import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import Session from '../models/Session';
import User from '../models/User';
import mongoose from 'mongoose';

let io: SocketServer;

// Map to track socket -> user/session details for disconnect handling
const socketMap = new Map<string, { userId: string; name: string; email: string; sessionCode: string; role?: string }>();

// In-memory storage for polls
interface Poll {
    id: string;
    sessionCode: string;
    question: string;
    options: string[];
    votes: { optionIndex: number; userId: string }[];
    isActive: boolean;
}

const polls = new Map<string, Poll>(); // pollId -> Poll

// In-memory storage for pulse check responses
const pulseCheckResponses = new Map<string, Set<string>>(); // sessionCode -> Set<userId>

export const initSocket = (server: HttpServer) => {
    io = new SocketServer(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log(`🔌 New client connected: ${socket.id}`);

        // Join a session room
        // Payload can be just a code (legacy/string) or object { sessionCode, user }
        socket.on('join_session', async (payload: any) => {
            let sessionCode = '';
            let user = null;

            if (typeof payload === 'string') {
                sessionCode = payload;
            } else {
                sessionCode = payload.sessionCode;
                user = payload.user;
            }

            if (!sessionCode) return;

            socket.join(sessionCode);
            console.log(`📁 User ${socket.id} joined session: ${sessionCode}`);

            // If we have user details, record attendance
            if (user && user._id) {
                try {
                    // Update socket map with role
                    socketMap.set(socket.id, {
                        userId: user._id,
                        name: user.name,
                        email: user.email,
                        sessionCode,
                        role: user.role || 'student' // Store role to filter later
                    });

                    // Only record attendance and broadcast for students, not teachers
                    if (user.role !== 'teacher') {
                        // Add attendance record
                        await Session.findOneAndUpdate(
                            { code: sessionCode },
                            {
                                $push: {
                                    attendance: {
                                        student: user._id,
                                        name: user.name,
                                        email: user.email,
                                        joinTime: new Date()
                                    }
                                }
                            }
                        );

                        // Fetch fresh user data (specifically points)
                        const freshUser = await User.findById(user._id).select('name email points avatar role');

                        // Broadcast that user joined to update leaderboards (students only)
                        io.to(sessionCode).emit('user_joined', freshUser);

                        // console.log(`Attendance recorded for ${user.name}`);
                    } else {
                        console.log(`👨‍🏫 Teacher ${user.name} joined session ${sessionCode} (not counted as student)`);
                    }
                } catch (error) {
                    console.error('Error recording attendance:', error);
                }
            }
        });

        // Leave a session room matches logic for disconnect essentially
        socket.on('leave_session', async (sessionCode: string) => {
            socket.leave(sessionCode);
            console.log(`🚪 User ${socket.id} left session: ${sessionCode}`);
            await handleUserLeave(socket.id);
        });

        socket.on('disconnect', async () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
            await handleUserLeave(socket.id);
        });

        // Whiteboard Synchronisation
        socket.on('whiteboard_open', ({ sessionCode }) => {
            socket.to(sessionCode).emit('whiteboard_open', { teacherId: socket.id });
        });

        socket.on('whiteboard_close', ({ sessionCode }) => {
            socket.to(sessionCode).emit('whiteboard_close');
        });

        socket.on('whiteboard_draw', ({ sessionCode, data }) => {
            socket.to(sessionCode).emit('whiteboard_draw', data);
        });

        socket.on('whiteboard_clear', ({ sessionCode }) => {
            socket.to(sessionCode).emit('whiteboard_clear');
        });

        // Engagement Features
        socket.on('student_understanding_update', ({ sessionCode, understanding, user }) => {
            socket.to(sessionCode).emit('teacher_understanding_update', {
                socketId: socket.id,
                understanding,
                user
            });
        });

        socket.on('student_hand_raise', ({ sessionCode, isRaised, user }) => {
            socket.to(sessionCode).emit('teacher_hand_raise', {
                socketId: socket.id,
                isRaised,
                user
            });
        });

        // Private Messaging
        socket.on('send_private_msg', ({ recipientId, message, sender }) => {
            // Find recipient's socket(s)
            for (const [sId, data] of socketMap.entries()) {
                if (data.userId.toString() === recipientId.toString() && data.sessionCode === sender.sessionCode) {
                    io.to(sId).emit('receive_private_msg', {
                        sender,
                        message,
                        timestamp: new Date()
                    });
                }
            }
        });

        // Pulse Check Features
        socket.on('pulse_check_init', ({ sessionCode }) => {
            socket.to(sessionCode).emit('pulse_check_start');
        });

        socket.on('pulse_check_response', async ({ userId, sessionCode }) => {
            console.log(`💓 Pulse check response from user ${userId} in session ${sessionCode}`);
            try {
                // Reward 15 bonus points for quick response
                const user = await User.findByIdAndUpdate(userId, { $inc: { points: 15 } }, { new: true });

                // Also add points to session leaderboard
                // Explicitly cast userId to ObjectId for the array filter match
                const userObjectId = new mongoose.Types.ObjectId(userId);

                const result = await Session.updateOne(
                    { code: sessionCode, "attendance.student": userObjectId },
                    { $inc: { "attendance.$.score": 15 } }
                );

                if (result.matchedCount === 0) {
                    console.warn(`⚠️ Failed to update session score for user ${userId}. Attendance record not found for code ${sessionCode}.`);
                } else {
                    console.log(`✅ Session score updated for user ${userId} (+15 pts). Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
                }

                if (user) {
                    io.to(sessionCode).emit('points_updated', { userId, points: user.points, name: user.name });
                }
            } catch (error) {
                console.error('❌ Pulse check reward error:', error);
            }
        });

        // 1. Emoji Reaction
        socket.on('emoji_reaction', ({ sessionCode, emoji, user }) => {
            io.to(sessionCode).emit('stream_emoji', { emoji, user, id: Math.random().toString(36).substr(2, 9) });
        });

        // 2. Save Bookmark
        socket.on('save_bookmark', async ({ userId, sessionCode, sessionTitle }) => {
            try {
                await User.findByIdAndUpdate(userId, {
                    $push: {
                        bookmarks: { sessionTitle, sessionCode, timestamp: new Date() }
                    }
                });
                socket.emit('bookmark_saved', { success: true });
            } catch (error) {
                console.error('Bookmark error:', error);
                socket.emit('bookmark_saved', { success: false });
            }
        });

        // 3. Trigger Mystery Spotlight
        socket.on('trigger_spotlight', async ({ sessionCode, teacherId }) => {
            // Get all unique users in this session from socketMap
            // Use a Map to deduplicate by userId
            const uniqueStudentsMap = new Map();

            for (const [sId, data] of socketMap.entries()) {
                // Filter: must be in same session AND not be the teacher
                // Use .toString() to ensure we compare strings (handles both string and ObjectId)
                if (data.sessionCode === sessionCode && data.userId.toString() !== teacherId.toString()) {
                    uniqueStudentsMap.set(data.userId.toString(), { id: data.userId, name: data.name });
                }
            }

            const sessionUsers = Array.from(uniqueStudentsMap.values());

            if (sessionUsers.length === 0) {
                socket.emit('spotlight_error', { message: 'No active students to spotlight!' });
                return;
            }

            // Pick a random student
            const winner = sessionUsers[Math.floor(Math.random() * sessionUsers.length)];

            console.log(`🎯 Spotlight winner in ${sessionCode}: ${winner.name} (Choice from ${sessionUsers.length} students)`);

            // Broadcast the result to everyone in the room
            io.to(sessionCode).emit('spotlight_result', { winner, spinDuration: 3000 });
        });

        // Teacher Answer - broadcast answer to all students in session
        socket.on('teacher-send-answer', ({ sessionCode, questionId, answer }) => {
            console.log(`📝 Teacher answered question ${questionId} in session ${sessionCode}`);
            
            // Broadcast answer to all users in the session room
            io.to(sessionCode).emit('new-answer', {
                questionId,
                answer,
                timestamp: Date.now()
            });
        });

        // ========== POLL FEATURE ==========
        
        // Teacher creates a poll
        socket.on('poll:create', ({ sessionCode, question, options }) => {
            console.log(`📊 Poll created in session ${sessionCode}`);
            
            const pollId = `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const poll: Poll = {
                id: pollId,
                sessionCode,
                question,
                options,
                votes: [],
                isActive: true
            };
            
            polls.set(pollId, poll);
            
            // Broadcast poll to all users in the session
            io.to(sessionCode).emit('poll:new', {
                pollId,
                question,
                options
            });
        });
        
        // Student votes on a poll
        socket.on('poll:vote', ({ pollId, optionIndex, userId }) => {
            console.log(`🗳️  Vote received for poll ${pollId} from user ${userId}`);
            
            const poll = polls.get(pollId);
            if (!poll || !poll.isActive) {
                socket.emit('poll:error', { message: 'Poll not found or inactive' });
                return;
            }
            
            // Check if user already voted (prevent duplicate votes)
            const existingVote = poll.votes.find(v => v.userId === userId);
            if (existingVote) {
                console.log(`⚠️  User ${userId} already voted on poll ${pollId}`);
                socket.emit('poll:error', { message: 'You have already voted' });
                return;
            }
            
            // Store the vote
            poll.votes.push({ optionIndex, userId });
            polls.set(pollId, poll);
            
            console.log(`✅ Vote recorded for poll ${pollId} - Total votes: ${poll.votes.length}`);
            socket.emit('poll:vote-success', { message: 'Vote recorded successfully' });
        });
        
        // Teacher requests poll results
        socket.on('poll:results', ({ pollId }) => {
            console.log(`📈 Results requested for poll ${pollId}`);
            
            const poll = polls.get(pollId);
            if (!poll) {
                socket.emit('poll:error', { message: 'Poll not found' });
                return;
            }
            
            // Calculate results
            const results = poll.options.map((option, index) => {
                const count = poll.votes.filter(v => v.optionIndex === index).length;
                return {
                    option,
                    count,
                    percentage: poll.votes.length > 0 ? Math.round((count / poll.votes.length) * 100) : 0
                };
            });
            
            const resultsData = {
                pollId,
                question: poll.question,
                results,
                totalVotes: poll.votes.length
            };
            
            // Broadcast results to all users in the session
            io.to(poll.sessionCode).emit('poll:results', resultsData);
            console.log(`📊 Poll results sent for ${pollId} - ${poll.votes.length} total votes`);
        });

        // ========== PULSE CHECK FEATURE ==========
        
        // Teacher starts pulse check
        socket.on('pulse:start', ({ sessionCode }) => {
            console.log(`💓 Pulse check started in session ${sessionCode}`);
            
            // Initialize or reset responses for this session
            pulseCheckResponses.set(sessionCode, new Set());
            
            // Broadcast pulse check to all students in the session
            io.to(sessionCode).emit('pulse:check', { sessionCode });
        });
        
        // Student responds to pulse check
        socket.on('pulse:response', ({ sessionCode, userId }) => {
            console.log(`💓 Pulse response from user ${userId} in session ${sessionCode}`);
            
            const responses = pulseCheckResponses.get(sessionCode);
            if (responses) {
                responses.add(userId);
                pulseCheckResponses.set(sessionCode, responses);
                console.log(`✅ Pulse response recorded - ${responses.size} students responded`);
            }
        });
        
        // Teacher ends pulse check and gets results
        socket.on('pulse:end', async ({ sessionCode }) => {
            console.log(`💓 Pulse check ended in session ${sessionCode}`);
            
            const responses = pulseCheckResponses.get(sessionCode) || new Set();
            
            // Get total students in session from socketMap (exclude teachers)
            let totalStudents = 0;
            for (const [, data] of socketMap.entries()) {
                if (data.sessionCode === sessionCode && data.role !== 'teacher') {
                    totalStudents++;
                }
            }
            
            const responded = responses.size;
            const absent = totalStudents - responded;
            
            const result = {
                total: totalStudents,
                responded,
                absent,
                percentage: totalStudents > 0 ? Math.round((responded / totalStudents) * 100) : 0
            };
            
            // Broadcast results to everyone in the session
            io.to(sessionCode).emit('pulse:result', result);
            console.log(`📊 Pulse check results: ${responded}/${totalStudents} students responded`);
            
            // Clear responses after showing results
            pulseCheckResponses.delete(sessionCode);
        });
    });

    return io;
};

// Helper to update leave time
const handleUserLeave = async (socketId: string) => {
    const data = socketMap.get(socketId);
    if (!data) return;

    const { userId, sessionCode } = data;

    try {
        // Find the specific session and update the LAST attendance record for this student that has no leaveTime
        // This is a bit tricky with atomic operators, so we might need to find first.

        // Simplest approach: Find session, find the relevant attendance entry (last one for this user), update it.
        const session = await Session.findOne({ code: sessionCode });
        if (session) {
            // Find the last entry for this student that doesn't have a leaveTime
            // We search from end
            let entryIndex = -1;
            for (let i = session.attendance.length - 1; i >= 0; i--) {
                if (session.attendance[i].student.toString() === userId.toString() && !session.attendance[i].leaveTime) {
                    entryIndex = i;
                    break;
                }
            }

            if (entryIndex !== -1) {
                session.attendance[entryIndex].leaveTime = new Date();
                await session.save();
                // console.log(`Leave time recorded for ${data.name}`);
            }
        }
    } catch (error) {
        console.error('Error recording leave time:', error);
    }

    // Clear from map
    socketMap.delete(socketId);
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

// Helper function to emit events to a session room
export const emitToSession = (sessionCode: string, event: string, data: any) => {
    if (io) {
        io.to(sessionCode).emit(event, data);
    }
};
