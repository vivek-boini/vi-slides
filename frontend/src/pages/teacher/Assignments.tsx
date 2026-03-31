import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAssignmentsRequest } from '../../lib/api';
import type { Assignment } from '../../lib/api';
import Navbar from '../../components/Navbar';
import './Dashboard.css';

function Assignments() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('[Assignments] Component mounted');
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    if (!token) {
      console.log('[Assignments] No token available');
      setError('Authentication required');
      setLoading(false);
      return;
    }

    console.log('[Assignments] Fetching assignments with token');
    try {
      const response = await getAssignmentsRequest(token);
      console.log('[Assignments] API response:', response);
      
      if (response.success && response.data) {
        setAssignments(response.data);
        console.log(`[Assignments] Loaded ${response.data.length} assignments`);
      } else {
        console.warn('[Assignments] Unexpected response structure:', response);
      }
    } catch (err) {
      console.error('[Assignments] Error fetching assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentClick = (assignmentId: string) => {
    console.log(`[Assignments] Navigating to assignment detail: ${assignmentId}`);
    navigate(`/teacher/assignment/${assignmentId}`);
  };

  const handleCreateNew = () => {
    console.log('[Assignments] Navigating to create new assignment');
    // TODO: Navigate to create assignment page when implemented
    alert('Create assignment feature coming soon!');
  };

  console.log('[Assignments] Render - loading:', loading, 'assignments:', assignments.length);

  return (
    <div className="dashboard-page">
      <Navbar variant="teacher" />
      
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1>Assignments</h1>
            <p>Manage your student assignments</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="vi-btn vi-btn-primary"
              onClick={handleCreateNew}
            >
              Create New Assignment
            </button>
            <button 
              className="vi-btn vi-btn-outline"
              onClick={() => {
                console.log('[Assignments] Navigating back to dashboard');
                navigate('/teacher/dashboard');
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Assignments List */}
        <div className="section">
          <h2 className="section-title">Your Assignments</h2>
          
          {loading ? (
            <div className="vi-card">
              <p className="empty-text">Loading assignments...</p>
            </div>
          ) : error ? (
            <div className="vi-card" style={{ borderColor: '#f44336' }}>
              <p className="empty-text" style={{ color: '#f44336' }}>
                Error: {error}
              </p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="vi-card">
              <p className="empty-text">No assignments yet. Create your first assignment!</p>
            </div>
          ) : (
            <div className="sessions-list">
              {assignments.map((assignment) => (
                <div 
                  key={assignment._id} 
                  className="vi-card session-card"
                  onClick={() => handleAssignmentClick(assignment._id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="session-info">
                    <h3>{assignment.title}</h3>
                    {assignment.description && (
                      <p className="session-desc">{assignment.description}</p>
                    )}
                    <div className="session-meta">
                      <span className="meta-item">
                        📅 Created: {new Date(assignment.createdAt).toLocaleDateString()}
                      </span>
                      {assignment.dueDate && (
                        <span className="meta-item">
                          ⏰ Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {assignment.maxMarks && (
                        <span className="meta-item">
                          📊 Max Marks: {assignment.maxMarks}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    className="vi-btn vi-btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssignmentClick(assignment._id);
                    }}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Assignments;
