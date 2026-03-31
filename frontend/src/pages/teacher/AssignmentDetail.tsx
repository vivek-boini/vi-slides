import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAssignmentByIdRequest } from '../../lib/api';
import type { Assignment } from '../../lib/api';
import Navbar from '../../components/Navbar';
import './Dashboard.css';

function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('[AssignmentDetail] Component mounted with ID:', id);
    if (id) {
      fetchAssignment(id);
    } else {
      console.error('[AssignmentDetail] No ID provided in route params');
      setError('No assignment ID provided');
      setLoading(false);
    }
  }, [id]);

  const fetchAssignment = async (assignmentId: string) => {
    if (!token) {
      console.log('[AssignmentDetail] No token available');
      setError('Authentication required');
      setLoading(false);
      return;
    }

    console.log(`[AssignmentDetail] Fetching assignment ID: ${assignmentId}`);
    try {
      const response = await getAssignmentByIdRequest(assignmentId, token);
      console.log('[AssignmentDetail] API response:', response);
      
      if (response.success && response.data) {
        setAssignment(response.data);
        console.log('[AssignmentDetail] Loaded assignment:', response.data);
      } else {
        console.warn('[AssignmentDetail] Unexpected response structure:', response);
        setError('Failed to load assignment');
      }
    } catch (err) {
      console.error('[AssignmentDetail] Error fetching assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    console.log('[AssignmentDetail] Edit button clicked');
    // TODO: Navigate to edit page when implemented
    alert('Edit assignment feature coming soon!');
  };

  const handleDelete = () => {
    console.log('[AssignmentDetail] Delete button clicked');
    // TODO: Implement delete functionality
    alert('Delete assignment feature coming soon!');
  };

  console.log('[AssignmentDetail] Render - loading:', loading, 'assignment:', assignment?.title);

  return (
    <div className="dashboard-page">
      <Navbar variant="teacher" />
      
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1>Assignment Details</h1>
            <p>View and manage assignment information</p>
          </div>
          <button 
            className="vi-btn vi-btn-outline"
            onClick={() => {
              console.log('[AssignmentDetail] Navigating back to assignments list');
              navigate('/teacher/assignments');
            }}
          >
            Back to Assignments
          </button>
        </div>

        {/* Assignment Details */}
        <div className="section">
          {loading ? (
            <div className="vi-card">
              <p className="empty-text">Loading assignment...</p>
            </div>
          ) : error ? (
            <div className="vi-card" style={{ borderColor: '#f44336' }}>
              <p className="empty-text" style={{ color: '#f44336' }}>
                Error: {error}
              </p>
              <button 
                className="vi-btn vi-btn-primary"
                onClick={() => navigate('/teacher/assignments')}
              >
                Go Back to Assignments
              </button>
            </div>
          ) : !assignment ? (
            <div className="vi-card">
              <p className="empty-text">Assignment not found</p>
              <button 
                className="vi-btn vi-btn-primary"
                onClick={() => navigate('/teacher/assignments')}
              >
                Go Back to Assignments
              </button>
            </div>
          ) : (
            <>
              <div className="vi-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ margin: '0 0 0.5rem 0' }}>{assignment.title}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                      Created: {new Date(assignment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="vi-btn vi-btn-secondary" onClick={handleEdit}>
                      Edit
                    </button>
                    <button 
                      className="vi-btn vi-btn-outline" 
                      onClick={handleDelete}
                      style={{ borderColor: '#f44336', color: '#f44336' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {assignment.description && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Description</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      {assignment.description}
                    </p>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {assignment.dueDate && (
                    <div>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        Due Date
                      </h4>
                      <p style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                        {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}

                  {assignment.maxMarks && (
                    <div>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        Maximum Marks
                      </h4>
                      <p style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                        {assignment.maxMarks}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Assignment ID
                    </h4>
                    <p style={{ fontSize: '0.85rem', fontFamily: 'monospace', margin: 0 }}>
                      {assignment._id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Submissions Section - Placeholder */}
              <div className="vi-card">
                <h3 style={{ marginTop: 0 }}>Student Submissions</h3>
                <p className="empty-text">
                  No submissions yet. Students can submit their work once the assignment is published.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AssignmentDetail;
