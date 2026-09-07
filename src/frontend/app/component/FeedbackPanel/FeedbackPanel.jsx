"use client";
import React from "react";
import "./FeedbackPanel.css";
import "../BookingPage/BookingPage.css";

const FeedbackPanel = ({
  meetings = [],
  onGiveFeedback,
  containerRef = null,
}) => {
  const handleFeedbackClick = (meeting) => {
    if (onGiveFeedback) {
      onGiveFeedback(meeting);
    }
  };

  return (
    <div className="feedback-container">
      <h1 className="feedback-title">-----FEEDBACK-----</h1>

      <h2 className="feedback-subtitle">Finished meetings</h2>

      <div className="feedback-table" ref={containerRef}>
        <div className="feedback-table-header">
          <span className="col-date">DATE</span>
          <span className="col-time">TIME</span>
          <span className="col-interviewer">INTERVIEWER</span>
          <span className="col-about">ABOUT</span>
          <span className="col-action" />
        </div>

        {meetings.length === 0 ? (
          <div className="feedback-empty">No finished meetings yet.</div>
        ) : (
          meetings.map((meeting) => (
            <div
              className={`feedback-table-row ${meeting.removing ? "removing" : ""}`}
              key={meeting.id}
              data-id={String(meeting.id)}
            >
              <span className="col-date">{meeting.date}</span>
              <span className="col-time">{meeting.time}</span>
              <span className="col-interviewer">{meeting.interviewer}</span>
              <span className="col-about">{meeting.about}</span>
              <span className="col-action">
                {meeting.status === "done" ? (
                  <span className="done-badge">DONE</span>
                ) : (
                  <button
                    type="button"
                    className="feedback-btn"
                    onClick={() => handleFeedbackClick(meeting)}
                  >
                    FEEDBACK
                  </button>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FeedbackPanel;
