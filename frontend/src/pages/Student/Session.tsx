import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getSessionRequest } from "../../lib/api";
import type { SessionData } from "../../lib/api";
import Navbar from "../../components/Navbar";
import "./Student.css";

const Session: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionCode: urlSessionCode } = useParams<{ sessionCode: string }>();
  const { token } = useAuth();

  // Get session from state or URL param
  const stateSession = location.state?.session as SessionData | undefined;
  const stateSessionCode = location.state?.sessionCode as string | undefined;
  const sessionCode = urlSessionCode || stateSession?.code || stateSessionCode;

  const [session, setSession] = useState<SessionData | null>(stateSession || null);
  const [loading, setLoading] = useState(!stateSession && !!sessionCode);
  const [error, setError] = useState("");

  // Fetch session if we have a code but no session data
  useEffect(() => {
    if (!session && sessionCode && token) {
      fetchSession();
    }
  }, [sessionCode, token]);

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
          <input type="text" className="vi-input" placeholder="Ask a question..." />
          <button className="vi-btn vi-btn-primary">Send Question</button>
        </div>

        <div className="student-question-count">Question 0 of 0</div>
      </div>
    </div>
  );
};

export default Session;