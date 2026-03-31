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

// Types for poll and pulse results
interface PollResult {
  pollId: string
  question: string
  results: { option: string; count: number; percentage: number }[]
  totalVotes: number
}

interface PulseResult {
  total: number
  responded: number
  absent: number
  percentage: number
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
  
  // Poll state
  const [showPollModal, setShowPollModal] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [activePollId, setActivePollId] = useState<string | null>(null)
  const [pollResults, setPollResults] = useState<PollResult | null>(null)
  
  // Pulse check state
  const [pulseCheckActive, setPulseCheckActive] = useState(false)
  const [pulseResults, setPulseResults] = useState<PulseResult | null>(null)
  
  // End session state
  const [endingSession, setEndingSession] = useState(false)
  
  const socketConnected = useRef(false)

  // Set page title
  useEffect(() => {
    document.title = 'Live Session - Vi-Slides'
  }, [])

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
      user: user ? { _id: user.id, name: user.name, email: user.email, role: user.role } : null 
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

    // Listen for new poll (to get pollId)
    const handlePollCreated = (data: { pollId: string }) => {
      console.log('[LiveSession] Poll created:', data)
      setActivePollId(data.pollId)
    }

    // Listen for poll results
    const handlePollResults = (data: PollResult) => {
      console.log('[LiveSession] Poll results received:', data)
      setPollResults(data)
    }

    // Listen for pulse check results
    const handlePulseResult = (data: PulseResult) => {
      console.log('[LiveSession] Pulse check results received:', data)
      setPulseResults(data)
      setPulseCheckActive(false)
    }

    socket.on("new_question", handleNewQuestion)
    socket.on("update_question", handleUpdateQuestion)
    socket.on("delete_question", handleDeleteQuestion)
    socket.on("user_joined", handleUserJoined)
    socket.on("new-answer", handleNewAnswer)
    socket.on("poll:new", handlePollCreated)
    socket.on("poll:results", handlePollResults)
    socket.on("pulse:result", handlePulseResult)

    // Cleanup on unmount
    return () => {
      socket.off("new_question", handleNewQuestion)
      socket.off("update_question", handleUpdateQuestion)
      socket.off("delete_question", handleDeleteQuestion)
      socket.off("user_joined", handleUserJoined)
      socket.off("new-answer", handleNewAnswer)
      socket.off("poll:new", handlePollCreated)
      socket.off("poll:results", handlePollResults)
      socket.off("pulse:result", handlePulseResult)
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
      const session = await getSessionRequest(id, token)
      setSession({ ...session, studentsJoined: 0 })
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

  // Poll handlers
  function handleCreatePoll() {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
      alert('Please enter a question and at least 2 options')
      return
    }

    const socket = connectSocket()
    const sessionCode = session?.code || id
    const validOptions = pollOptions.filter(o => o.trim())

    socket.emit('poll:create', {
      sessionCode,
      question: pollQuestion.trim(),
      options: validOptions
    })

    // Store poll ID (will be received via poll:new event)
    console.log('[LiveSession] Poll created')
    
    // Reset form and close modal
    setPollQuestion('')
    setPollOptions(['', ''])
    setShowPollModal(false)
  }

  function handleShowPollResults() {
    if (!activePollId) {
      alert('No active poll')
      return
    }

    const socket = connectSocket()
    socket.emit('poll:results', { pollId: activePollId })
  }

  function handleAddPollOption() {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ''])
    }
  }

  function handleRemovePollOption(index: number) {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index))
    }
  }

  // Pulse check handlers
  function handleStartPulseCheck() {
    const socket = connectSocket()
    const sessionCode = session?.code || id

    socket.emit('pulse:start', { sessionCode })
    setPulseCheckActive(true)
    setPulseResults(null)
    console.log('[LiveSession] Pulse check started')
  }

  function handleEndPulseCheck() {
    const socket = connectSocket()
    const sessionCode = session?.code || id

    socket.emit('pulse:end', { sessionCode })
    console.log('[LiveSession] Pulse check ended')
  }

  // End session handler
  async function handleEndSession() {
    if (!session?.code) return
    
    const confirmEnd = window.confirm('Are you sure you want to end this session? All students will be notified.')
    if (!confirmEnd) return
    
    setEndingSession(true)
    
    try {
      const socket = connectSocket()
      const sessionCode = session.code
      
      // Emit session end event via socket
      socket.emit('session:end', { sessionCode })
      
      console.log('[LiveSession] Session ended')
      
      // Navigate to summary page
      navigate(`/teacher/session/${sessionCode}/summary`)
    } catch (err) {
      console.error('Error ending session:', err)
      alert('Failed to end session. Please try again.')
      setEndingSession(false)
    }
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
                  <button className="action-btn" onClick={() => setShowPollModal(true)}>
                    <span className="action-icon">◧</span>
                    <span>Poll</span>
                  </button>
                  <button 
                    className="action-btn"
                    onClick={pulseCheckActive ? handleEndPulseCheck : handleStartPulseCheck}
                  >
                    <span className="action-icon">◉</span>
                    <span>{pulseCheckActive ? 'End Pulse' : 'Pulse Check'}</span>
                  </button>
                  <button className="action-btn">
                    <span className="action-icon">▦</span>
                    <span>Whiteboard</span>
                  </button>
                </nav>
                
                {/* Poll Results Button */}
                {activePollId && (
                  <button 
                    className="vi-btn vi-btn-secondary"
                    onClick={handleShowPollResults}
                    style={{ marginTop: '1rem', width: '100%' }}
                  >
                    Show Poll Results
                  </button>
                )}
                
                {/* Pulse Check Results Display */}
                {pulseResults && (
                  <div className="pulse-results" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Pulse Check Results</h4>
                    <div style={{ fontSize: '0.9rem' }}>
                      <div>✅ Present: {pulseResults.responded}</div>
                      <div>❌ Absent: {pulseResults.absent}</div>
                      <div>📊 Total: {pulseResults.total}</div>
                      <div style={{ marginTop: '0.5rem', fontWeight: 600 }}>
                        {pulseResults.percentage}% attendance
                      </div>
                    </div>
                  </div>
                )}
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
                
                {/* End Session Button */}
                <button 
                  className="vi-btn"
                  onClick={handleEndSession}
                  disabled={endingSession}
                  style={{ 
                    marginTop: '1.5rem', 
                    width: '100%', 
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  {endingSession ? 'Ending...' : '🔴 End Session'}
                </button>
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

      {/* Poll Creation Modal */}
      {showPollModal && (
        <div className="modal-overlay" onClick={() => setShowPollModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Poll</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Question:</label>
              <input
                type="text"
                className="vi-input"
                placeholder="Enter poll question..."
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Options:</label>
              {pollOptions.map((option, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    className="vi-input"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...pollOptions]
                      newOptions[index] = e.target.value
                      setPollOptions(newOptions)
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      className="vi-btn vi-btn-outline"
                      onClick={() => handleRemovePollOption(index)}
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button
                  className="vi-btn vi-btn-secondary"
                  onClick={handleAddPollOption}
                  style={{ marginTop: '0.5rem' }}
                >
                  + Add Option
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="vi-btn vi-btn-outline"
                onClick={() => setShowPollModal(false)}
              >
                Cancel
              </button>
              <button
                className="vi-btn vi-btn-primary"
                onClick={handleCreatePoll}
              >
                Create Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Poll Results Modal */}
      {pollResults && (
        <div className="modal-overlay" onClick={() => setPollResults(null)}>
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
                        background: 'var(--gradient-orange)',
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
              onClick={() => setPollResults(null)}
              style={{ width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveSession
