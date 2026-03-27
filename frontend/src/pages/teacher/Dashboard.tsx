import { useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/Card'
import Button from '../../components/Button'
import './Dashboard.css'

const sessions = [
  { id: 'abc123', title: 'Introduction to React', date: 'Mar 25, 2026', students: 32, status: 'active' },
  { id: 'def456', title: 'JavaScript Fundamentals', date: 'Mar 24, 2026', students: 28, status: 'active' },
  { id: 'ghi789', title: 'CSS Basics', date: 'Mar 20, 2026', students: 45, status: 'completed' }
]

function Dashboard() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')

  const filteredSessions = sessions.filter(s => s.status === activeTab)

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Good evening, Teacher 👋</h1>
        <Link to="/teacher/session/create">
          <Button>+ New Session</Button>
        </Link>
      </header>

      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-value">2</div>
          <div className="stat-label">Active Sessions</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">3</div>
          <div className="stat-label">Sessions Conducted</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">105</div>
          <div className="stat-label">Total Students</div>
        </Card>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active
        </button>
        <button 
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
      </div>

      <div className="sessions-list">
        {filteredSessions.map(session => (
          <Card key={session.id} className="session-card">
            <div className="session-info">
              <h3 className="session-title">{session.title}</h3>
              <div className="session-meta">
                <span>{session.date}</span>
                <span>•</span>
                <span>{session.students} students</span>
              </div>
            </div>
            <Link to={`/teacher/session/${session.id}`}>
              <Button variant="secondary">View</Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
