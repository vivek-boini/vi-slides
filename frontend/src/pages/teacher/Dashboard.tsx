import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { dashboardRequest } from '../../lib/api'
import type { DashboardResponse } from '../../types/auth'
import Navbar from '../../components/Navbar'
import WelcomeCard from '../../components/WelcomeCard'
import './Dashboard.css'

import sessionIcon from '../../assets/session.png'
import assignmentIcon from '../../assets/assignment.png'
import groupsIcon from '../../assets/groups.png'
import joinIcon from '../../assets/join.png'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api'

interface Session {
  id: string
  code: string
  title: string
  description: string
  createdAt: string
  status: string
  studentsJoined: number
}

function Dashboard() {
  const { token, user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null)

  const fetchDashboardMetrics = useCallback(async () => {
    if (!token) return
    try {
      const data = await dashboardRequest("teacher", token)
      setDashboardData(data)
    } catch (err) {
      console.log('Dashboard metrics not available', err)
    }
  }, [token])

  const fetchSessions = useCallback(async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/sessions`, { headers })
      const data = await response.json()
      
      if (response.ok && data.success) {
        setSessions(data.sessions)
      } else {
        setSessions([])
      }
    } catch (err) {
      console.log('Failed to fetch sessions', err)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchSessions()
      fetchDashboardMetrics()
    }
  }, [token, fetchSessions, fetchDashboardMetrics])

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const sessionsConducted = dashboardData?.metrics?.sessionsConducted ?? sessions.length
  const totalAssignments = dashboardData?.metrics?.totalAssignments ?? 0
  const totalStudents = dashboardData?.metrics?.totalStudents ?? sessions.reduce((sum, s) => sum + s.studentsJoined, 0)
  const recentSessions = sessions.slice(0, 5)

  return (
    <div className="dashboard-page">
      <Navbar variant="teacher" />
      
      <div className="dashboard-content">
        <WelcomeCard 
          name={user?.name || 'Teacher'} 
          subtitle={dashboardData?.message ?? 'Manage your sessions and engage with students!'} 
        />

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card vi-card vi-card-orange">
            <div className="stat-icon-wrap sessions-icon-bg">
              <img src={sessionIcon} alt="sessions" className="stat-icon-img" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{sessionsConducted}</div>
              <div className="stat-label">Sessions Conducted</div>
            </div>
          </div>
          <div className="stat-card vi-card vi-card-teal">
            <div className="stat-icon-wrap assignments-icon-bg">
              <img src={assignmentIcon} alt="assignments" className="stat-icon-img" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{totalAssignments}</div>
              <div className="stat-label">Assignments</div>
            </div>
          </div>
          <div className="stat-card vi-card vi-card-blue">
            <div className="stat-icon-wrap overview-icon-bg">
              <img src={groupsIcon} alt="students" className="stat-icon-img" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{totalStudents}</div>
              <div className="stat-label">Total Students</div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Card Style */}
        <div className="section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/teacher/session/create" className="action-link">
              <div className="vi-card vi-card-orange action-card-large">
                <img src={joinIcon} alt="create" className="action-card-icon" />
                <div className="action-card-content">
                  <h3>Create a Session</h3>
                  <p>Start a new live session with your students</p>
                  <button className="vi-btn vi-btn-primary">Create</button>
                </div>
              </div>
            </Link>
            <Link to="/teacher/assignments" className="action-link">
              <div className="vi-card vi-card-teal action-card-large">
                <img src={assignmentIcon} alt="assignments" className="action-card-icon" />
                <div className="action-card-content">
                  <h3>Assignments</h3>
                  <p>View and manage student assignments</p>
                  <button className="vi-btn vi-btn-secondary">View</button>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="section">
          <h2 className="section-title">Recent Sessions</h2>
          <div className="sessions-list">
            {loading ? (
              <div className="vi-card session-card">
                <p className="empty-text">Loading sessions...</p>
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="vi-card session-card empty-state">
                <p className="empty-text">No sessions yet</p>
              </div>
            ) : (
              recentSessions.map(session => (
                <div key={session.id} className="vi-card session-card">
                  <div className="session-info">
                    <h3 className="session-title">{session.title}</h3>
                    <div className="session-meta">
                      <span className="session-code">Code: {session.code}</span>
                      <span className="meta-dot">•</span>
                      <span>{formatDate(session.createdAt)}</span>
                      <span className="meta-dot">•</span>
                      <span>{session.studentsJoined} students</span>
                    </div>
                  </div>
                  <Link to={`/teacher/session/${session.id}`}>
                    <button className="vi-btn vi-btn-outline">View</button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
