import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getSessionSummaryRequest, type SessionSummary } from '../../lib/api'
import Navbar from '../../components/Navbar'
import './LiveSession.css'

function SessionSummaryPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    document.title = 'Session Summary - Vi-Slides'
  }, [])

  useEffect(() => {
    if (code && token) {
      fetchSummary()
    }
  }, [code, token])

  async function fetchSummary() {
    if (!code || !token) return
    
    try {
      const data = await getSessionSummaryRequest(code, token)
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadPDF() {
    if (!summary) return
    
    setGenerating(true)
    
    try {
      // Dynamically import jsPDF
      const { default: jsPDF } = await import('jspdf')
      
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 20
      let yPos = 20
      
      // Title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Session Summary', pageWidth / 2, yPos, { align: 'center' })
      yPos += 15
      
      // Session Info
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(summary.title, pageWidth / 2, yPos, { align: 'center' })
      yPos += 10
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Session Code: ${summary.sessionCode}`, margin, yPos)
      yPos += 6
      doc.text(`Total Students: ${summary.totalStudents}`, margin, yPos)
      yPos += 6
      doc.text(`Total Questions: ${summary.totalQuestions}`, margin, yPos)
      yPos += 6
      
      if (summary.endedAt) {
        doc.text(`Ended: ${new Date(summary.endedAt).toLocaleString()}`, margin, yPos)
        yPos += 6
      }
      
      yPos += 10
      
      // Divider line
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 10
      
      // Questions section
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Questions & Answers', margin, yPos)
      yPos += 10
      
      doc.setFontSize(10)
      
      summary.questions.forEach((q, index) => {
        // Check if we need a new page
        if (yPos > 260) {
          doc.addPage()
          yPos = 20
        }
        
        // Question number and text
        doc.setFont('helvetica', 'bold')
        const questionText = `Q${index + 1}: ${q.text}`
        const questionLines = doc.splitTextToSize(questionText, pageWidth - (margin * 2))
        doc.text(questionLines, margin, yPos)
        yPos += questionLines.length * 5 + 2
        
        // Student name
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(100, 100, 100)
        doc.text(`- ${q.studentName}`, margin + 5, yPos)
        yPos += 5
        
        // Answer
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        if (q.answer) {
          const answerText = `A: ${q.answer}`
          const answerLines = doc.splitTextToSize(answerText, pageWidth - (margin * 2) - 5)
          doc.setTextColor(0, 100, 0)
          doc.text(answerLines, margin + 5, yPos)
          doc.setTextColor(0, 0, 0)
          yPos += answerLines.length * 5 + 2
        } else {
          doc.setTextColor(150, 150, 150)
          doc.text('A: Not answered', margin + 5, yPos)
          doc.setTextColor(0, 0, 0)
          yPos += 7
        }
        
        yPos += 8
      })
      
      // Mood Summary at the end if available
      if (summary.moodSummary) {
        if (yPos > 240) {
          doc.addPage()
          yPos = 20
        }
        
        yPos += 5
        doc.setDrawColor(200, 200, 200)
        doc.line(margin, yPos, pageWidth - margin, yPos)
        yPos += 10
        
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Session Mood Summary', margin, yPos)
        yPos += 8
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const moodLines = doc.splitTextToSize(summary.moodSummary, pageWidth - (margin * 2))
        doc.text(moodLines, margin, yPos)
      }
      
      // Save the PDF
      doc.save(`session-${summary.sessionCode}-summary.pdf`)
      
    } catch (err) {
      console.error('PDF generation error:', err)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="live-session-page">
        <Navbar variant="teacher" />
        <div className="session-content">
          <p>Loading summary...</p>
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="live-session-page">
        <Navbar variant="teacher" />
        <div className="session-content">
          <div className="vi-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <h2>Error Loading Summary</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{error || 'Summary not found'}</p>
            <button 
              className="vi-btn vi-btn-primary"
              onClick={() => navigate('/teacher/dashboard')}
              style={{ marginTop: '1rem' }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="live-session-page">
      <Navbar variant="teacher" />
      
      <div className="session-content" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        {/* Header Card */}
        <div className="vi-card vi-card-orange" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ margin: '0 0 0.5rem 0' }}>{summary.title}</h1>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
                Session Code: <strong>{summary.sessionCode}</strong>
              </p>
              {summary.description && (
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{summary.description}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="vi-btn vi-btn-primary"
                onClick={handleDownloadPDF}
                disabled={generating}
              >
                {generating ? 'Generating...' : '📄 Download PDF'}
              </button>
              <button
                className="vi-btn vi-btn-outline"
                onClick={() => navigate('/teacher/dashboard')}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="vi-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>
              {summary.totalStudents}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Students Joined</div>
          </div>
          <div className="vi-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--secondary)' }}>
              {summary.totalQuestions}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Questions Asked</div>
          </div>
          <div className="vi-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success, #10b981)' }}>
              {summary.questions.filter(q => q.answer).length}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Answered</div>
          </div>
        </div>

        {/* Mood Summary */}
        {summary.moodSummary && (
          <div className="vi-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>🎭 Session Mood Summary</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {summary.moodSummary}
            </p>
          </div>
        )}

        {/* Questions List */}
        <div className="vi-card">
          <h2 style={{ margin: '0 0 1rem 0' }}>Questions & Answers</h2>
          
          {summary.questions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
              No questions were asked in this session.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {summary.questions.map((q, index) => (
                <div 
                  key={q._id} 
                  style={{ 
                    padding: '1rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-md)',
                    borderLeft: q.answer ? '4px solid var(--success, #10b981)' : '4px solid var(--warning, #f59e0b)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '600' }}>Q{index + 1}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(q.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500' }}>{q.text}</p>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    — {q.studentName}
                  </p>
                  {q.answer ? (
                    <div style={{ 
                      padding: '0.75rem', 
                      background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', 
                      borderRadius: 'var(--radius-sm)',
                      marginTop: '0.5rem'
                    }}>
                      <strong style={{ color: 'var(--success, #059669)' }}>Answer:</strong>
                      <p style={{ margin: '0.25rem 0 0 0' }}>{q.answer}</p>
                    </div>
                  ) : (
                    <p style={{ 
                      margin: '0.5rem 0 0 0', 
                      color: 'var(--warning, #d97706)', 
                      fontSize: '0.9rem',
                      fontStyle: 'italic'
                    }}>
                      Not answered
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session Timestamps */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <p style={{ margin: '0.25rem 0' }}>
            Started: {new Date(summary.createdAt).toLocaleString()}
          </p>
          {summary.endedAt && (
            <p style={{ margin: '0.25rem 0' }}>
              Ended: {new Date(summary.endedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default SessionSummaryPage
