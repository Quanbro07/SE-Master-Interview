"use client";
import React, { useState } from "react";
import "../BookingPage/BookingPage.css"; // reuse popup styles
import "./FeedbackPanel.css";

const Star = ({ filled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`star-btn ${filled ? "filled" : ""}`}
    aria-label={filled ? "filled" : "empty"}
    style={{
      background: "transparent",
      border: "none",
      fontSize: "28px",
      cursor: "pointer",
      color: filled ? "#fbbf24" : "#6b7280",
    }}
  >
    ★
  </button>
);

const FeedbackCard = ({ meeting, onClose, onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");

  if (!meeting) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div
        className="popup-content feedback-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 520, padding: 28 }}
      >
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 44,
              overflow: "hidden",
              border: "4px solid #7dd3fc",
            }}
          >
            <img src="/user.png" alt="avatar" style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, color: "#fff" }}>
              How was your mock interview with{" "}
              {meeting.interviewer.replace(/^Mr\s+/, "")}?
            </h3>
            <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  filled={s <= rating}
                  onClick={() => setRating(s)}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={{ color: "#cbd5e1", fontSize: 14 }}>Comments</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={6}
            style={{
              width: "100%",
              marginTop: 8,
              padding: 12,
              borderRadius: 8,
              border: "none",
              resize: "vertical",
              background: "rgba(39,39,42,0.6)",
              color: "#fff",
            }}
            placeholder={`Share your thoughts about ${meeting.interviewer}`}
          />
        </div>

        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 18 }}
        >
          <button
            type="button"
            className="popup-btn btn-book"
            onClick={() => {
              if (onSubmit) onSubmit({ meeting, rating, comments });
            }}
            style={{ width: 140 }}
          >
            SUBMIT
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackCard;
