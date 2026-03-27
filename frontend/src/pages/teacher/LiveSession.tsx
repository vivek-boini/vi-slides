import { useParams, useLocation, useNavigate } from 'react-router-dom'
import Card from '../../components/Card'
import Button from '../../components/Button'
import './LiveSession.css'

function LiveSession() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const sessionData = location.state as { title?: string; description?: string; isNew?: boolean } | null

  const handleEndSession = () => {
    navigate('/teacher/dashboard')
  }

  return (
    <div className="live-session">
      {sessionData?.isNew && (
        <Card className="success-banner">
          <span className="success-icon">✓</span>
          <span>Session Created Successfully!</span>
        </Card>
      )}

      <Card className="session-card">
        <div className="session-header">
          <div>
            <h1>{sessionData?.title || `Session: ${id}`}</h1>
            {sessionData?.description && (
              <p className="session-description">{sessionData.description}</p>
            )}
          </div>
          <span className="live-badge">● LIVE</span>
        </div>

        <div className="session-info-box">
          <div className="info-item">
            <span className="info-label">Session ID</span>
            <span className="info-value">{id}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Students Joined</span>
            <span className="info-value">0</span>
          </div>
        </div>

        <div className="placeholder-area">
          <p>Session controls and features will be added here...</p>
        </div>

        <div className="session-actions">
          <Button variant="secondary" onClick={handleEndSession}>
            End Session
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default LiveSession
