import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import "./Student.css";

const AssignmentDetail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Assignment data is passed from the previous route via location state.
  const data = location.state;

  const [text, setText] = useState("");
  const [pdf, setPdf] = useState("");

  if (!data) {
    return <p style={{ padding: "20px" }}>No assignment data</p>;
  }

  return (
    <div className="student-assignment-page">
      <Navbar variant="student" />

      <div className="student-assignment-content">
        <div className="student-assignment-container vi-card vi-card-teal">

          {/* HEADER WITH BACK BUTTON */}
          <div className="student-assignment-header-list">
            <button
              className="vi-btn vi-btn-outline"
              onClick={() => navigate(-1)}
            >
              Back to Assignments
            </button>
          </div>

          {/* TOP DETAILS */}
          <div className="student-assignment-detail-header">
            <h1>{data.name}</h1>
            <p>{data.desc}</p>

            <div className="student-assignment-meta">
              <span>Max Marks: <b>{data.marks}</b></span>
              <span>Deadline: <b>31/03/2026, 9:00 PM</b></span>
              <span>Teacher: <b>Viany Kumar Dasari</b></span>
            </div>
          </div>

          {/* SUBMIT SECTION */}
          <div className="student-submit-box">
            <h2>Submit Assignment</h2>

            <label>Submission Text *</label>
            <textarea
              placeholder="Enter your assignment submission here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <label>PDF URL</label>
            <input
              type="text"
              placeholder="https://example.com/your-file.pdf"
              value={pdf}
              onChange={(e) => setPdf(e.target.value)}
            />

            <p className="student-hint">
              Upload your PDF to a cloud service (Google Drive, Dropbox) and paste the link here
            </p>

            <button className="vi-btn vi-btn-primary student-submit-btn">
              Submit Assignment
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AssignmentDetail;