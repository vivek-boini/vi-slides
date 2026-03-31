import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { joinSessionRequest } from "../../lib/api";
import Navbar from "../../components/Navbar";
import WelcomeCard from "../../components/WelcomeCard";
import "./Student.css";

import joinIcon from "../../assets/join.png";
import assignmentIcon from "../../assets/assignment.png";
import overviewIcon from "../../assets/overview.png";
import sessionIcon from "../../assets/session.png";

const StudentDashboard: React.FC = () => {
  const [code, setCode] = useState(""); 
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const handleJoin = async () => {
    if (code.trim().length === 0) {
      setError("Code should be entered");
      return;
    }

    if (code.length !== 6) {
      setError("Code must be exactly 6 characters");
      return;
    }

    if (!token) {
      setError("You must be logged in to join a session");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await joinSessionRequest({ code: code.toUpperCase() }, token);
      
      // Navigate to session with the session code
      const sessionCode = response.data.code;
      navigate(`/student/session/${sessionCode}`, { 
        state: { session: response.data } 
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid session code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="student-dashboard">
      <Navbar variant="student" />
      
      <div className="dashboard-content">
        <WelcomeCard 
          name={user?.name || 'Student'} 
          subtitle="Join a session to start asking questions!" 
        />

        {/* Stats Section - Same as Teacher */}
        <div className="stats-grid">
          <div className="stat-card vi-card vi-card-orange">
            <div className="stat-icon-wrap sessions-icon-bg">
              <img src={sessionIcon} alt="sessions" className="stat-icon-img" />
            </div>
            <div className="stat-content">
              <div className="stat-value">0</div>
              <div className="stat-label">Sessions Joined</div>
            </div>
          </div>
          <div className="stat-card vi-card vi-card-teal">
            <div className="stat-icon-wrap assignments-icon-bg">
              <img src={assignmentIcon} alt="assignments" className="stat-icon-img" />
            </div>
            <div className="stat-content">
              <div className="stat-value">0 / 0</div>
              <div className="stat-label">Completed / Pending</div>
            </div>
          </div>
          <div className="stat-card vi-card vi-card-blue">
            <div className="stat-icon-wrap overview-icon-bg">
              <img src={overviewIcon} alt="overview" className="stat-icon-img" />
            </div>
            <div className="stat-content">
              <div className="stat-value">Active</div>
              <div className="stat-label">Overview</div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <div className="vi-card vi-card-orange action-card-large">
              <img src={joinIcon} alt="join" className="action-card-icon" />
              <div className="action-card-content">
                <h3>Join Session</h3>
                <p>Enter the 6-digit code provided by your teacher.</p>
                <div className="join-input-group">
                  <input
                    type="text"
                    className="vi-input"
                    placeholder="E.G. AB1234"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    disabled={isLoading}
                  />
                  <button 
                    className="vi-btn vi-btn-primary" 
                    onClick={handleJoin}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Joining...' : 'Join'}
                  </button>
                </div>
                {error && <p className="error-text">{error}</p>}
              </div>
            </div>

            {/* Assignments Card */}
            <div className="vi-card vi-card-teal action-card-large">
              <img src={assignmentIcon} alt="assignment" className="action-card-icon" />
              <div className="action-card-content">
                <h3>Assignments</h3>
                <p>View and submit your assignments.</p>
                <button 
                  className="vi-btn vi-btn-secondary"
                  onClick={() => navigate("/student/assignments")}
                >
                  View Assignments
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;