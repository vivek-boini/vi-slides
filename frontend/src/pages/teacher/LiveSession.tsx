import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import Button from '../../components/Button'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../context/AuthContext'
import { getSessionRequest } from '../../lib/api'
import type { SessionData } from '../../lib/api'
import { connectSocket, disconnectSocket } from '../../lib/socket'
import type { Question } from '../../lib/socket'
import './LiveSession.css'

// Types - extend SessionData for local use
interface Session extends SessionData {
  studentsJoined?: number
}

type ActiveTab = 'questions' | 'actions' | 'session'

// Participant type for real-time tracking
interface Participant {
  id: string
  name: string
}

function LiveSession() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  
  // Get session from navigation state or fetch from API
  const stateSession = (location.state as { session?: SessionData })?.session
  const [session, setSession] = useState<Session | null>(
    stateSession ? { ...stateSession, studentsJoined: 0 } : null
  )
  const [isNew, setIsNew] = useState(
    (location.state as { isNew?: boolean })?.isNew || false
  )
  const [loading, setLoading] = useState(!stateSession)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<ActiveTab>('questions')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showResponseBox, setShowResponseBox] = useState(false)
  const [responseText, setResponseText] = useState('')
  
  // Real-time questions state
  const [questions, setQuestions] = useState<Question[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  
  const socketConnected = useRef(false)

  // Fetch session data if not passed via state
  useEffect(() => {
    if (!session && id && token) {
      fetchSession()
    }
  }, [id, token])

  // Clear the "new session" banner after a few seconds
  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setIsNew(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isNew])

  // Socket connection for real-time updates
  useEffect(() => {
    const sessionCode = session?.code || id
    if (!sessionCode) return

    const socket = connectSocket()
    
    // Join the session room as teacher
    socket.emit("join_session", { 
      sessionCode, 
      user: user ? { _id: user.id, name: user.name, email: user.email } : null 
    })
    socketConnected.current = true

    // Listen for new questions
    const handleNewQuestion = (question: Question) => {
      setQuestions(prev => {
        // Avoid duplicates
        if (prev.some(q => q._id === question._id)) return prev
        return [question, ...prev]
      })
    }

    // Listen for question updates
    const handleUpdateQuestion = (question: Question) => {
      setQuestions(prev => prev.map(q => q._id === question._id ? question : q))
    }

    // Listen for question deletions
    const handleDeleteQuestion = (questionId: string) => {
      setQuestions(prev => prev.filter(q => q._id !== questionId))
    }

    // Listen for users joining
    const handleUserJoined = (userData: { _id: string; name: string }) => {
      if (userData && userData._id) {
        setParticipants(prev => {
          if (prev.some(p => p.id === userData._id)) return prev
          return [...prev, { id: userData._id, name: userData.name }]
        })
        // Update student count
        setSession(prev => prev ? { ...prev, studentsJoined: (prev.studentsJoined || 0) + 1 } : prev)
      }
    }

    // Listen for new answers (from other sources or broadcast)
    const handleNewAnswer = (data: { questionId: string; answer: string; timestamp: number }) => {
      setQuestions(prev => prev.map(q => 
        q._id === data.questionId 
          ? { ...q, teacherAnswer: data.answer } 
          : q
      ))
    }

    socket.on("new_question", handleNewQuestion)
    socket.on("update_question", handleUpdateQuestion)
    socket.on("delete_question", handleDeleteQuestion)
    socket.on("user_joined", handleUserJoined)
    socket.on("new-answer", handleNewAnswer)

    // Cleanup on unmount
    return () => {
      socket.off("new_question", handleNewQuestion)
      socket.off("update_question", handleUpdateQuestion)
      socket.off("delete_question", handleDeleteQuestion)
      socket.off("user_joined", handleUserJoined)
      socket.off("new-answer", handleNewAnswer)
      socket.emit("leave_session", sessionCode)
      disconnectSocket()
      socketConnected.current = false
    }
  }, [session?.code, id, user])

  // Fetch existing questions when session loads
  useEffect(() => {
    if (session?._id && token) {
      fetchQuestions()
    }
  }, [session?._id, token])

  async function fetchSession() {
    if (!id || !token) return
    
    try {
      const response = await getSessionRequest(id, token)
      setSession({ ...response.data, studentsJoined: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function fetchQuestions() {
    if (!session?._id || !token) return
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001/api"}/questions/session/${session._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          setQuestions(data.data)
        }
      }
    } catch (err) {
      console.error("Failed to fetch questions:", err)
    }
  }

  function handleCopyCode() {
    if (session?.code) {
      navigator.clipboard.writeText(session.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleEndSession() {
    navigate('/teacher/dashboard')
  }

  function goToPrevQuestion() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  function goToNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  function handleSendAnswer() {
    if (!responseText.trim() || !currentQuestion) return
    
    const socket = connectSocket()
    const sessionCode = session?.code || id
    
    // Emit answer to all students in the session
    socket.emit("teacher-send-answer", {
      sessionCode,
      questionId: currentQuestion._id,
      answer: responseText.trim()
    })
    
    // Clear input and close response box
    setResponseText('')
    setShowResponseBox(false)
  }

  const currentQuestion = questions[currentQuestionIndex]

  // Loading state
  if (loading) {
    return (
      <div className="live-session">
        <div className="loading-state">Loading session...</div>
      </div>
    )
  }

  // Error state
  if (error || !session) {
    return (
      <div className="live-session">
        <div className="error-state">
          <h2>Session Not Found</h2>
          <p>{error || 'The session you are looking for does not exist.'}</p>
          <Button onClick={() => navigate('/teacher/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="live-session-page">
      <Navbar variant="teacher" />
      
      <div className="live-session">
      {/* Success Banner */}
      {isNew && (
        <div className="success-banner">
          <span className="success-icon">✓</span>
          <span>Session Created Successfully!</span>
        </div>
      )}

      {/* Editor Layout */}
      <div className={`editor-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        {/* Sidebar Toggle */}
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {/* Left Sidebar - Navigation */}
        <aside className={`editor-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          {/* Tab Buttons */}
          <div className="sidebar-tabs">
            <button 
              className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
            >
              Questions
            </button>
            <button 
              className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
              onClick={() => setActiveTab('actions')}
            >
              Actions
            </button>
            <button 
              className={`tab-btn ${activeTab === 'session' ? 'active' : ''}`}
              onClick={() => setActiveTab('session')}
            >
              Session
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="sidebar-content">
            {activeTab === 'questions' && (
              <div className="sidebar-section">
                <div className="section-header">
                  <span>All Questions</span>
                  <span className="badge">{questions.length}</span>
                </div>
                {questions.length === 0 ? (
                  <p style={{ padding: '1rem', color: '#888', fontSize: '0.9rem' }}>
                    No questions yet. Waiting for students...
                  </p>
                ) : (
                  <ul className="question-list">
                    {questions.map((q, index) => (
                      <li 
                        key={q._id} 
                        className={`question-item ${index === currentQuestionIndex ? 'active' : ''}`}
                        onClick={() => setCurrentQuestionIndex(index)}
                      >
                        <span className="q-number">Q{index + 1}</span>
                        <span className="q-preview">{q.content.substring(0, 30)}...</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="sidebar-section">
                <div className="section-header">Tools</div>
                <nav className="action-list">
                  <button className="action-btn">
                    <span className="action-icon">◧</span>
                    <span>Poll</span>
                  </button>
                  <button className="action-btn">
                    <span className="action-icon">◉</span>
                    <span>Pulse Check</span>
                  </button>
                  <button className="action-btn">
                    <span className="action-icon">▦</span>
                    <span>Whiteboard</span>
                  </button>
                  <button className="action-btn">
                    <span className="action-icon">✦</span>
                    <span>AI Assist</span>
                  </button>
                </nav>
              </div>
            )}

            {activeTab === 'session' && (
              <div className="sidebar-section">
                <div className="section-header">Session Details</div>
                <div className="session-details">
                  <div className="detail-item">
                    <span className="detail-label">Code</span>
                    <span className="detail-value code">{session.code}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Started</span>
                    <span className="detail-value">
                      {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Participants</span>
                    <span className="detail-value highlight">{participants.length}</span>
                  </div>
                </div>
                
                <div className="section-header" style={{ marginTop: '20px' }}>
                  <span>Joined Students</span>
                  <span className="badge">{participants.length}</span>
                </div>
                {participants.length === 0 ? (
                  <p style={{ padding: '1rem', color: '#888', fontSize: '0.9rem' }}>
                    No students yet...
                  </p>
                ) : (
                  <ul className="participants-list">
                    {participants.map(p => (
                      <li key={p.id}>{p.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="editor-main">
          {/* Header */}
          <header className="editor-header">
            <div className="header-left">
              <h1 className="session-title">{session.title}</h1>
            </div>
            <div className="header-right">
              <div className="code-display">
                <span className="code-label">CODE:</span>
                <span className="code-value">{session.code}</span>
                <button className="copy-btn" onClick={handleCopyCode}>
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
              <div className="student-count">
                <span className="count-value">{participants.length}</span>
                <span className="count-label">Students</span>
              </div>
              <Button variant="secondary" onClick={handleEndSession}>
                End Session
              </Button>
            </div>
          </header>

          {/* Canvas Area */}
          <div className="editor-canvas">
            {/* Question Card - Main Focus */}
            {questions.length === 0 ? (
              <div className="question-card">
                <div className="question-content" style={{ textAlign: 'center', padding: '3rem' }}>
                  <p className="question-text" style={{ color: '#888' }}>
                    Waiting for student questions...
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '1rem' }}>
                    Share the code <strong>{session.code}</strong> with your students
                  </p>
                </div>
              </div>
            ) : (
              <div className="question-card">
                <span className="question-counter">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                
                <div className="question-main">
                  <button className="nav-btn" onClick={goToPrevQuestion} disabled={currentQuestionIndex === 0}>‹</button>
                  <div className="question-content">
                    <p className="question-text">{currentQuestion?.content}</p>
                    <span className="question-author">— {currentQuestion?.user?.name || 'Anonymous'}</span>
                  </div>
                  <button className="nav-btn" onClick={goToNextQuestion} disabled={currentQuestionIndex >= questions.length - 1}>›</button>
                </div>

                {/* Question Actions */}
                <div className="question-actions">
                  <button className="q-action-btn ai-btn">
                    <span className="q-action-icon">✦</span>
                    <span>Answer with AI</span>
                  </button>
                  <button 
                    className={`q-action-btn respond-btn ${showResponseBox ? 'active' : ''}`}
                    onClick={() => setShowResponseBox(!showResponseBox)}
                  >
                    <span className="q-action-icon">↩</span>
                    <span>Respond</span>
                  </button>
                  <button className="q-action-btn done-btn">
                    <span className="q-action-icon">✓</span>
                    <span>Mark as Done</span>
                  </button>
                </div>

                {/* Display Teacher Answer if exists */}
                {currentQuestion?.teacherAnswer && (
                  <div className="teacher-answer-display">
                    <div className="answer-label">Your Answer:</div>
                    <div className="answer-text">{currentQuestion.teacherAnswer}</div>
                  </div>
                )}

                {/* Response Box */}
                {showResponseBox && (
                  <div className="response-box">
                    <textarea
                      className="response-input"
                      placeholder="Type your response..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                    />
                    <div className="response-actions">
                      <button 
                        className="response-cancel"
                        onClick={() => { setShowResponseBox(false); setResponseText(''); }}
                      >
                        Cancel
                      </button>
                      <button 
                        className="response-send"
                        onClick={handleSendAnswer}
                        disabled={!responseText.trim()}
                      >
                        Send Answer
                      </button>
                    </div>
                  </div>
                )}

                <div className="question-dots">
                  {questions.map((_, index) => (
                    <button 
                      key={index} 
                      className={`dot ${index === currentQuestionIndex ? 'active' : ''}`}
                      onClick={() => setCurrentQuestionIndex(index)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      </div>
    </div>
  )
}

export default LiveSession
