import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/Card'
import Button from '../../components/Button'
import './CreateSession.css'

function CreateSession() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [password, setPassword] = useState('')

  const handleCreate = () => {
    if (!title.trim()) return
    
    // Generate a simple session ID
    const sessionId = Date.now().toString(36)
    
    // Navigate to the live session page with session data
    navigate(`/teacher/session/${sessionId}`, {
      state: { title, description, password, isNew: true }
    })
  }

  return (
    <div className="create-session">
      <h1>Create New Session</h1>
      <p className="subtitle">Start a new interactive session for your students</p>

      <Card className="form-card">
        <div className="form-group">
          <label htmlFor="title">Session Title *</label>
          <input
            id="title"
            type="text"
            placeholder="e.g., Introduction to React"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            placeholder="Brief description of the session..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password (optional)</label>
          <input
            id="password"
            type="password"
            placeholder="Leave empty for no password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate('/teacher/dashboard')}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim()}>
            Create Session
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default CreateSession
