"use client";
import NavigationBar from "../NavigationBar/NavigationBar";
import ChatPanel from "../ChatPanel/ChatPanel";
import BookingList from "../BookingList/BookingList";
import UserHeader from "../UserHeader/UserHeader";
import React, { useState, useRef, useEffect } from "react";
import BookingConfirmPopup from "./BookingConfirmPopup";
import "./BookingPage.css";

const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

const renderStarRating = (rating = 5.0) => {
  const stars = [];
  const numericRating = Math.min(5.0, Math.max(0, parseFloat(rating) || 0));

  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        style={{ color: numericRating >= i ? "#FBBF24" : "#4B5563" }}
      >
        ★
      </span>,
    );
  }
  return stars;
};

const ProfilePopup = ({ mentor, onBook, onCancel }) => {
  if (!mentor) return null;
  const ratingValue = parseFloat(mentor.rate || mentor.rating || 5.0).toFixed(
    1,
  );
  const reviewCount = mentor.reviews ?? 0;

  return (
    <div className="popup-overlay" onClick={onCancel}>
      <div
        className="popup-content profile-popup-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-popup-header">
          <div className="profile-avatar-wrapper">
            <img src={mentor.avatar || "/user.png"} alt={mentor.name} />
          </div>
          <div className="profile-name-block">
            <h3 className="profile-name">{mentor.name}</h3>
            <p className="profile-role" style={{ textTransform: "uppercase" }}>
              {mentor.displayPosition || mentor.position || "SOFTWARE ENGINEER"}
            </p>
            <p
              className="profile-exp"
              style={{
                color: "#cbd5e1",
                fontSize: "13px",
                margin: "2px 0 0 0",
              }}
            >
              {mentor.expYears ?? 0} Years of experience
            </p>
          </div>
          <div
            className="profile-rating"
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
          >
            <span style={{ fontSize: "16px", letterSpacing: "2px" }}>
              {renderStarRating(ratingValue)}
            </span>
            <span
              style={{ marginLeft: "6px", color: "#FBBF24", fontWeight: "600" }}
            >
              ({reviewCount} reviews)
            </span>
          </div>
        </div>

        <div className="profile-details-body">
          <aside className="profile-left-panel">
            <div className="profile-left-header">
              <h4>About me</h4>
            </div>
            <ul className="profile-list"></ul>
          </aside>
          <div className="profile-right-panel">
            <div className="profile-right-section">
              <h4>Work experience</h4>
              <ul className="profile-list"></ul>
            </div>
            <div className="profile-right-section">
              <h4>Languages</h4>
              <ul className="profile-list">
                <li>English</li>
                <li>Vietnamese</li>
              </ul>
            </div>
            <div className="profile-right-section fee-block">
              <h4>Fee</h4>
              <p className="fee-text">
                {mentor.price ? `${mentor.price}/session/45 minutes` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="popup-actions profile-popup-actions">
          <button className="popup-btn btn-book" onClick={onBook}>
            BOOK
          </button>
          <button className="popup-btn btn-cancel" onClick={onCancel}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};

const BookingPage = () => {
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(true);

  const [activePopup, setActivePopup] = useState(null);
  const [selectedMentor, setSelectedMentor] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [notice, setNotice] = useState(null);
  const noticeTimeoutRef = useRef(null);
  const [showPopup, setShowPopup] = useState(false);

  const handleBookFromChat = (mentorData) => {
    setSelectedMentor(mentorData);
    setShowPopup(true);
  };

  useEffect(() => {
    const user = getStoredUser();
    if (user) setCurrentUser(user);
  }, []);

  const showNotice = (message) => {
    setNotice(message);
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => setNotice(null), 5000);
  };

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  const handleOpenProfile = (mentor) => {
    setSelectedMentor(mentor);
    setActivePopup("profile");
  };

  const handleGoToConfirm = () => {
    setActivePopup("confirm");
  };

  const handleCloseAllPopups = () => {
    setActivePopup(null);
    setSelectedMentor(null);
    setShowPopup(false);
  };

  return (
    <div className="dashboard-container">
      <NavigationBar
        isCollapsed={navCollapsed}
        setIsCollapsed={setNavCollapsed}
      />

      <main className="dashboard-main">
        <BookingList
          navCollapsed={navCollapsed}
          chatCollapsed={chatCollapsed}
          onViewProfile={handleOpenProfile}
        />
      </main>

      <UserHeader
        user={currentUser}
        isChatOpen={!chatCollapsed}
        onToggleChat={() => setChatCollapsed((prev) => !prev)}
      />

      <ChatPanel
        isCollapsed={chatCollapsed}
        onBookFromChat={handleBookFromChat}
      />

      {showPopup && selectedMentor && (
        <BookingConfirmPopup
          mentor={selectedMentor}
          onConfirm={() => {
            handleCloseAllPopups();
            showNotice(
              "Booking request submitted! Please wait for Interviewer approval.",
            );
          }}
          onCancel={handleCloseAllPopups}
        />
      )}

      {activePopup === "profile" && (
        <ProfilePopup
          mentor={selectedMentor}
          onBook={handleGoToConfirm}
          onCancel={handleCloseAllPopups}
        />
      )}

      {activePopup === "confirm" && (
        <BookingConfirmPopup
          mentor={selectedMentor}
          onConfirm={() => {
            handleCloseAllPopups();
            showNotice(
              "Booking request submitted! Check your Booking History.",
            );
          }}
          onCancel={handleCloseAllPopups}
        />
      )}
    </div>
  );
};

export default BookingPage;
