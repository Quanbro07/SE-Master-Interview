"use client";
import NavigationBar from "../NavigationBar/NavigationBar";
import ChatPanel from "../ChatPanel/ChatPanel";
import BookingList from "../BookingList/BookingList";
import UserHeader from "../UserHeader/UserHeader";
import React, { useState, useEffect } from "react";
import BookingConfirmPopup from "./BookingConfirmPopup";
import Toast from "../Toast/Toast";
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

const BookingPage = () => {
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(true);

  const [activePopup, setActivePopup] = useState(null);
  const [selectedMentor, setSelectedMentor] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  const handleBookFromChat = (mentorData) => {
    setSelectedMentor(mentorData);
    setShowPopup(true);
  };

  useEffect(() => {
    const user = getStoredUser();
    if (user) setCurrentUser(user);
  }, []);

  const showToastNotice = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Thay vì mở profile popup, nhảy thẳng sang bước confirm đặt lịch
  const handleOpenProfile = (mentor) => {
    setSelectedMentor(mentor);
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
            showToastNotice(
              "Booking request submitted! Please wait for Interviewer approval.",
            );
          }}
          onCancel={handleCloseAllPopups}
        />
      )}

      {activePopup === "confirm" && (
        <BookingConfirmPopup
          mentor={selectedMentor}
          onConfirm={() => {
            handleCloseAllPopups();
            showToastNotice(
              "Booking request submitted! Check your Booking History.",
            );
          }}
          onCancel={handleCloseAllPopups}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
};

export default BookingPage;
