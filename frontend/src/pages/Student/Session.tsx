import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getSessionRequest } from "../../lib/api";
import type { SessionData } from "../../lib/api";
import { connectSocket, disconnectSocket, getSocket } from "../../lib/socket";
import type { Question } from "../../lib/socket";
import Navbar from "../../components/Navbar";
import "./Student.css";

const Session: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionCode: urlSessionCode } = useParams<{ sessionCode: string }>();
  const { token, user } = useAuth();

  // Get session from state or URL param
  const stateSession = location.state?.session as SessionData | undefined;
  const stateSessionCode = location.state?.sessionCode as string | undefined;
  const sessionCode = urlSessionCode || stateSession?.code || stateSessionCode;

  const [session, setSession] = useState<SessionData | null>(stateSession || null);
  const [loading, setLoading] = useState(!stateSession && !!sessionCode);
  const [error, setError] = useState("");
  
  // Question state
  const [questionText, setQuestionText] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"" | "sent" | "error">("");
  
  const socketConnected = useRef(false);

  // Fetch session if we have a code but no session data
  useEffect(() => {
    if (!session && sessionCode && token) {
      fetchSession();
    }
  }, [sessionCode, token]);

  // Socket connection and listeners
  useEffect(() => {
    if (!sessionCode) return;

    const socket = connectSocket();
    
    // Join the session room
    socket.emit("join_session", { 
      sessionCode, 
      user: user ? { _id: user.id, name: user.name, email: user.email } : null 
    });
    socketConnected.current = true;

    // Listen for new questions (to see own question and others)
    const handleNewQuestion = (question: Question) => {
      setQuestions(prev => {
        // Avoid duplicates
        if (prev.some(q => q._id === question._id)) return prev;
        return [question, ...prev];
      });
    };

    // Listen for question updates
    const handleUpdateQuestion = (question: Question) => {
      setQuestions(prev => prev.map(q => q._id === question._id ? question : q));
    };

    // Listen for question deletions
    const handleDeleteQuestion = (questionId: string) => {
      setQuestions(prev => prev.filter(q => q._id !== questionId));
    };

    socket.on("new_question", handleNewQuestion);
    socket.on("update_question", handleUpdateQuestion);
    socket.on("delete_question", handleDeleteQuestion);

    // Cleanup on unmount
    return () => {
      socket.off("new_question", handleNewQuestion);
      socket.off("update_question", handleUpdateQuestion);
      socket.off("delete_question", handleDeleteQuestion);
      socket.emit("leave_session", sessionCode);
      disconnectSocket();
      socketConnected.current = false;
    };
  }, [sessionCode, user]);

  async function fetchSession() {
    if (!sessionCode || !token) return;
    
    setLoading(true);
    setError("");
    
    try {
      const response = await getSessionRequest(sessionCode, token);
      setSession(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendQuestion() {
    if (!questionText.trim() || !sessionCode || !session || !token) return;
    
    setSending(true);
    setSendStatus("");

    try {
      // Use REST API to create question (which triggers socket event)
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001/api"}/questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            content: questionText.trim(),
            sessionId: session._id
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send question");
      }

      setQuestionText("");
      setSendStatus("sent");
      setTimeout(() => setSendStatus(""), 2000);
    } catch {
      setSendStatus("error");
      setTimeout(() => setSendStatus(""), 3000);
    } finally {
      setSending(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="student-session-page">
        <Navbar variant="student" />
        <div className="student-session-content">
          <div className="vi-card" style={{ textAlign: "center", padding: "2rem" }}>
            <p>Loading session...</p>
          </div>
        </div>
      </div>
    );
  }

  // No session found
  if (!sessionCode || error) {
    return (
      <div className="student-session-page">
        <Navbar variant="student" />
        <div className="student-session-error">
          <h2>{error || "No session found"}</h2>
          <button className="vi-btn vi-btn-primary" onClick={() => navigate("/student/dashboard")}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const displayCode = session?.code || sessionCode;
  const displayTitle = session?.title || `Session: ${displayCode}`;

  return (
    <div className="student-session-page">
      <Navbar variant="student" />
      
      <div className="student-session-content">
        {/* Top Bar */}
        <div className="student-session-header vi-card">
          <div>
            <span className="student-live">LIVE SESSION</span>
            <h3>{displayTitle}</h3>
          </div>

          <div className="student-session-actions">
            <div className="student-code-box">CODE {displayCode}</div>
            <button
              className="vi-btn vi-btn-outline student-leave-btn"
              onClick={() => navigate("/student/dashboard")}
            >
              Leave
            </button>
          </div>
        </div>

        {/* Feeling Buttons */}
        <div className="student-feeling-section vi-card vi-card-teal">
          <h3>How are you feeling?</h3>
          <div className="student-feeling-buttons">
            <button>Lost</button>
            <button>Ok</button>
            <button className="student-active">Got it</button>
          </div>

          <button className="vi-btn vi-btn-primary">Raise Hand</button>
        </div>

        {/* Question Box */}
        <div className="student-question-box">
          <input 
            type="text" 
            className="vi-input" 
            placeholder="Ask a question..." 
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendQuestion()}
            disabled={sending}
          />
          <button 
            className="vi-btn vi-btn-primary" 
            onClick={handleSendQuestion}
            disabled={sending || !questionText.trim()}
          >
            {sending ? "Sending..." : sendStatus === "sent" ? "Sent ✓" : "Send Question"}
          </button>
        </div>
        {sendStatus === "error" && (
          <p className="error-text" style={{ textAlign: "center", marginTop: "0.5rem" }}>
            Failed to send question. Try again.
          </p>
        )}

        <div className="student-question-count">
          {questions.length > 0 
            ? `${questions.length} question${questions.length !== 1 ? "s" : ""} in this session`
            : "No questions yet. Be the first to ask!"}
        </div>
      </div>
    </div>
  );
};

export default Session;