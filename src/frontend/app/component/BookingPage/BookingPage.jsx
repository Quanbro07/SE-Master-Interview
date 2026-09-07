"use client";

import React, { useState, useEffect } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import ChatPanel from "../ChatPanel/ChatPanel";
import BookingList from "../BookingList/BookingList";
import UserHeader from "../UserHeader/UserHeader";
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

  // Quản lý duy nhất 1 state Popup & Mentor đang chọn
  const [activePopup, setActivePopup] = useState(null); // 'confirm' | null
  const [selectedMentor, setSelectedMentor] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const user = getStoredUser();
    if (user) setCurrentUser(user);
  }, []);

  const showToastNotice = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Trigger mở popup từ Chat Panel
  const handleBookFromChat = (mentorData) => {
    setSelectedMentor(mentorData);
    setActivePopup("confirm");
  };

  // Trigger mở popup từ Booking List (Danh sách Interviewer)
  const handleOpenProfile = (mentor) => {
    setSelectedMentor(mentor);
    setActivePopup("confirm");
  };

  // Hàm dọn dẹp và đóng tất cả popup
  const handleCloseAllPopups = () => {
    setActivePopup(null);
    setSelectedMentor(null);
  };

  // Hàm xử lý sau khi đặt lịch thành công
  const handleConfirmBooking = () => {
    handleCloseAllPopups();
    showToastNotice("Booking request submitted! Check your Booking History.");
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

      {/* Render duy nhất 1 instance của BookingConfirmPopup */}
      {activePopup === "confirm" && selectedMentor && (
        <BookingConfirmPopup
          mentor={selectedMentor}
          onConfirm={handleConfirmBooking}
          onCancel={handleCloseAllPopups}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
};

export default BookingPage;
