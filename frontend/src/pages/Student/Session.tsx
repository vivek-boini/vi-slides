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
  
  // Poll state
  const [activePoll, setActivePoll] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [pollResults, setPollResults] = useState<any>(null);
  
  // Pulse check state
  const [showPulseCheck, setShowPulseCheck] = useState(false);
  
  // Session ended state
  const [sessionEnded, setSessionEnded] = useState(false);
  
  const socketConnected = useRef(false);

  // Set page title
  useEffect(() => {
    document.title = 'Student Session - Vi-Slides';
  }, []);

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

    // Listen for new answers from teacher
    const handleNewAnswer = (data: { questionId: string; answer: string; timestamp: number }) => {
      setQuestions(prev => prev.map(q => 
        q._id === data.questionId 
          ? { ...q, teacherAnswer: data.answer } 
          : q
      ));
    };

    // Listen for new poll
    const handleNewPoll = (data: any) => {
      console.log('[Student] New poll received:', data);
      setActivePoll(data);
      setSelectedOption(null);
      setHasVoted(false);
      setPollResults(null);
    };

    // Listen for poll results
    const handlePollResults = (data: any) => {
      console.log('[Student] Poll results received:', data);
      setPollResults(data);
    };

    // Listen for pulse check
    const handlePulseCheck = () => {
      console.log('[Student] Pulse check received');
      setShowPulseCheck(true);
    };

    // Listen for session ended
    const handleSessionEnded = () => {
      console.log('[Student] Session ended by teacher');
      setSessionEnded(true);
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 3000);
    };

    socket.on("new_question", handleNewQuestion);
    socket.on("update_question", handleUpdateQuestion);
    socket.on("delete_question", handleDeleteQuestion);
    socket.on("new-answer", handleNewAnswer);
    socket.on("poll:new", handleNewPoll);
    socket.on("poll:results", handlePollResults);
    socket.on("pulse:check", handlePulseCheck);
    socket.on("session:ended", handleSessionEnded);

    // Cleanup on unmount
    return () => {
      socket.off("new_question", handleNewQuestion);
      socket.off("update_question", handleUpdateQuestion);
      socket.off("delete_question", handleDeleteQuestion);
      socket.off("new-answer", handleNewAnswer);
      socket.off("poll:new", handleNewPoll);
      socket.off("poll:results", handlePollResults);
      socket.off("pulse:check", handlePulseCheck);
      socket.off("session:ended", handleSessionEnded);
      socket.emit("leave_session", sessionCode);
      disconnectSocket();
      socketConnected.current = false;
    };
  }, [sessionCode, user, navigate]);

  async function fetchSession() {
    if (!sessionCode || !token) return;
    
    setLoading(true);
    setError("");
    
    try {
      const sessionData = await getSessionRequest(sessionCode, token);
      setSession(sessionData);
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

  function handleVote() {
    if (selectedOption === null || !activePoll || !user) return;

    const socket = getSocket();
    socket.emit('poll:vote', {
      pollId: activePoll.pollId,
      optionIndex: selectedOption,
      userId: user.id
    });

    setHasVoted(true);
    console.log('[Student] Vote submitted');
  }

  function handlePulseResponse() {
    if (!sessionCode || !user) return;

    const socket = getSocket();
    socket.emit('pulse:response', {
      sessionCode,
      userId: user.id
    });

    setShowPulseCheck(false);
    console.log('[Student] Pulse response sent');
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

        {/* Questions List with Answers */}
        {questions.length > 0 && (
          <div className="student-questions-list">
            {questions.map((question) => (
              <div key={question._id} className="student-question-item vi-card">
                <div className="question-header">
                  <span className="question-author">
                    {question.user?.name || 'Anonymous'}
                  </span>
                  <span className="question-time">
                    {new Date(question.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="question-content">{question.content}</p>
                
                {question.teacherAnswer && (
                  <div className="teacher-answer">
                    <div className="answer-label">Teacher's Answer:</div>
                    <p className="answer-content">{question.teacherAnswer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Poll Modal */}
      {activePoll && !pollResults && (
        <div className="modal-overlay" onClick={() => setActivePoll(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Poll</h2>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 'normal' }}>{activePoll.question}</h3>
            <div style={{ marginBottom: '1.5rem' }}>
              {activePoll.options.map((option: string, index: number) => (
                <div
                  key={index}
                  className={`poll-option ${selectedOption === index ? 'selected' : ''}`}
                  onClick={() => !hasVoted && setSelectedOption(index)}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    background: selectedOption === index ? 'var(--gradient-orange)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: hasVoted ? 'not-allowed' : 'pointer',
                    opacity: hasVoted ? 0.6 : 1
                  }}
                >
                  {option}
                </div>
              ))}
            </div>
            {!hasVoted ? (
              <button
                className="vi-btn vi-btn-primary"
                onClick={handleVote}
                disabled={selectedOption === null}
                style={{ width: '100%' }}
              >
                Submit Vote
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-teal)', fontWeight: 600 }}>
                ✓ Vote submitted! Waiting for results...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Poll Results Modal */}
      {pollResults && (
        <div className="modal-overlay" onClick={() => { setPollResults(null); setActivePoll(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Poll Results</h2>
            <h3 style={{ marginBottom: '1rem', fontWeight: 'normal' }}>{pollResults.question}</h3>
            <div style={{ marginBottom: '1rem' }}>
              {pollResults.results.map((result: any, index: number) => (
                <div key={index} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>{result.option}</span>
                    <span style={{ fontWeight: 600 }}>{result.count} votes ({result.percentage}%)</span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div
                      style={{
                        background: 'var(--gradient-teal)',
                        height: '100%',
                        width: `${result.percentage}%`,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Total Votes: {pollResults.totalVotes}
            </div>
            <button
              className="vi-btn vi-btn-primary"
              onClick={() => { setPollResults(null); setActivePoll(null); }}
              style={{ width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Pulse Check Modal */}
      {showPulseCheck && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h2>Pulse Check</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>Are you present?</p>
            <button
              className="vi-btn vi-btn-primary"
              onClick={handlePulseResponse}
              style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}
            >
              ✓ I'm Here!
            </button>
          </div>
        </div>
      )}

      {/* Session Ended Modal */}
      {sessionEnded && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👋</div>
            <h2>Session Ended</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              The teacher has ended this session.
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Redirecting to dashboard in a few seconds...
            </p>
            <button
              className="vi-btn vi-btn-primary"
              onClick={() => navigate('/student/dashboard')}
              style={{ width: '100%', marginTop: '1.5rem' }}
            >
              Go to Dashboard Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Session;