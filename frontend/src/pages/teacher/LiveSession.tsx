import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Button from '../../components/Button'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../context/AuthContext'
import { getSessionRequest } from '../../lib/api'
import type { SessionData } from '../../lib/api'
import './LiveSession.css'

// Types - extend SessionData for local use
interface Session extends SessionData {
  studentsJoined?: number
}

type ActiveTab = 'questions' | 'actions' | 'session'

// Sample questions for demo
const sampleQuestions = [
  { id: 1, text: "Can you explain the difference between let and const?", student: "Student 1" },
  { id: 2, text: "What is the purpose of useEffect hook?", student: "Student 2" },
  { id: 3, text: "How does React handle re-rendering?", student: "Student 3" },
]

// Sample participants for demo
const sampleParticipants = [
  { id: 1, name: "Alice Johnson" },
  { id: 2, name: "Bob Smith" },
  { id: 3, name: "Charlie Brown" },
  { id: 4, name: "Diana Ross" },
]

function LiveSession() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = useAuth()
  
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
    if (currentQuestionIndex < sampleQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const currentQuestion = sampleQuestions[currentQuestionIndex]

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
                  <span className="badge">{sampleQuestions.length}</span>
                </div>
                <ul className="question-list">
                  {sampleQuestions.map((q, index) => (
                    <li 
                      key={q.id} 
                      className={`question-item ${index === currentQuestionIndex ? 'active' : ''}`}
                      onClick={() => setCurrentQuestionIndex(index)}
                    >
                      <span className="q-number">Q{index + 1}</span>
                      <span className="q-preview">{q.text.substring(0, 30)}...</span>
                    </li>
                  ))}
                </ul>
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
                    <span className="detail-value highlight">{sampleParticipants.length}</span>
                  </div>
                </div>
                
                <div className="section-header" style={{ marginTop: '20px' }}>
                  <span>Joined Students</span>
                  <span className="badge">{sampleParticipants.length}</span>
                </div>
                <ul className="participants-list">
                  {sampleParticipants.map(p => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
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
                <span className="count-value">{session.studentsJoined}</span>
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
            <div className="question-card">
              <span className="question-counter">
                Question {currentQuestionIndex + 1} of {sampleQuestions.length}
              </span>
              
              <div className="question-main">
                <button className="nav-btn" onClick={goToPrevQuestion}>‹</button>
                <div className="question-content">
                  <p className="question-text">{currentQuestion.text}</p>
                  <span className="question-author">— {currentQuestion.student}</span>
                </div>
                <button className="nav-btn" onClick={goToNextQuestion}>›</button>
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
                      onClick={() => { setShowResponseBox(false); setResponseText(''); }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

              <div className="question-dots">
                {sampleQuestions.map((_, index) => (
                  <button 
                    key={index} 
                    className={`dot ${index === currentQuestionIndex ? 'active' : ''}`}
                    onClick={() => setCurrentQuestionIndex(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
      </div>
    </div>
  )
}

export default LiveSession
