"use client";
import NavigationBar from "../NavigationBar/NavigationBar";
import ChatPanel from "../ChatPanel/ChatPanel";
import BookingList from "../BookingList/BookingList";
import React, { useState, useRef, useEffect } from "react";
import "./BookingPage.css";

const ProfilePopup = ({ mentor, onBook, onCancel }) => {
  if (!mentor) return null;
  return (
    <div className="popup-overlay" onClick={onCancel}>
      <div
        className="popup-content profile-popup-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-popup-header">
          <div className="profile-avatar-wrapper">
            <img src="/user.png" alt={mentor.name} />
          </div>
          <div className="profile-name-block">
            <h3 className="profile-name">{mentor.name}</h3>
            <p className="profile-role">{mentor.role}</p>
          </div>
          <div className="profile-rating">⭐⭐⭐⭐⭐ (54 reviews)</div>
        </div>

        <div className="profile-details-body">
          <aside className="profile-left-panel">
            <div className="profile-left-header">
              <h4>About me</h4>
            </div>
            <ul className="profile-list">
              <li>Seasoned tech lead at Google</li>
              <li>10+ years in software development</li>
              <li>Expert in scalable web apps</li>
              <li>Skilled in leading cross-functional teams</li>
              <li>Delivers innovative solutions</li>
            </ul>
          </aside>

          <div className="profile-right-panel">
            <div className="profile-right-section">
              <h4>Work experience</h4>
              <ul className="profile-list">
                <li>Led development of scalable web applications</li>
                <li>Managed cross-functional teams to deliver projects</li>
                <li>Implemented innovative solutions to complex problems</li>
              </ul>
            </div>
            <div className="profile-right-section">
              <h4>Languages</h4>
              <ul className="profile-list">
                <li>English</li>
                <li>Japanese</li>
                <li>German</li>
              </ul>
            </div>
            <div className="profile-right-section fee-block">
              <h4>Fee</h4>
              <p className="fee-text">
                {mentor.price || "$10"}/session/45 minutes
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

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PaymentPopup = ({ mentor, onConfirm, onCancel }) => {
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(todayStart);
  const [selectedTime, setSelectedTime] = useState("07:00-08:00");

  const monthLabel = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  const monthStartDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();
  const firstWeekdayIndex = (monthStartDay + 6) % 7; // convert Sunday=0 to Monday-first
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();

  const availableTimes = ["07:00-08:00", "14:30-15:30", "20:00-21:00"];

  const canMovePrevious =
    currentMonth.getFullYear() > todayStart.getFullYear() ||
    (currentMonth.getFullYear() === todayStart.getFullYear() &&
      currentMonth.getMonth() > todayStart.getMonth());

  const handleMoveMonth = (offset) => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1),
    );
  };

  const normalizeDate = (date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isSameDate = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const dayCells = [];
  for (let i = 0; i < firstWeekdayIndex; i += 1) {
    dayCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    dayCells.push(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
    );
  }

  const isDateDisabled = (date) => {
    if (!date) return true;
    return normalizeDate(date) < todayStart;
  };

  return (
    <div className="popup-overlay" onClick={onCancel}>
      <div
        className="popup-content payment-popup-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="payment-grid">
          {/* Cột trái: Lịch biểu */}
          <div className="payment-schedule">
            <h3 className="popup-title">Book Interview with {mentor?.name}</h3>
            <div className="calendar-controls">
              <button
                type="button"
                className="calendar-nav-button"
                onClick={() => handleMoveMonth(-1)}
                disabled={!canMovePrevious}
              >
                ‹
              </button>
              <div className="calendar-header">{monthLabel}</div>
              <button
                type="button"
                className="calendar-nav-button"
                onClick={() => handleMoveMonth(1)}
              >
                ›
              </button>
            </div>
            <div className="calendar-days-grid calendar-weekdays">
              {weekdayNames.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="calendar-days-grid calendar-dates">
              {dayCells.map((date, index) => {
                const disabled = isDateDisabled(date);
                const selected = date && isSameDate(date, selectedDate);
                return (
                  <button
                    key={index}
                    type="button"
                    className={`calendar-day ${
                      !date ? "empty" : disabled ? "disabled" : ""
                    } ${selected ? "active" : ""}`}
                    onClick={() => {
                      if (date && !disabled) {
                        setSelectedDate(date);
                      }
                    }}
                    disabled={!date || disabled}
                  >
                    {date ? date.getDate() : ""}
                  </button>
                );
              })}
            </div>
            <div className="time-slots-section">
              <h4>Available time</h4>
              <div className="time-action-row">
                <div className="time-slots">
                  {availableTimes.map((time) => (
                    <button
                      type="button"
                      key={time}
                      className={`slot-btn ${
                        selectedTime === time ? "selected" : ""
                      }`}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: Form thanh toán */}
          <div className="payment-form-details">
            <h3 className="popup-title">Payment Details</h3>
            <div className="input-group">
              <label>CARD NUMBER</label>
              <input type="text" placeholder="XXXX XXXX XXXX XXXX" />
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>CVV</label>
                <input type="password" placeholder="XXX" />
              </div>
              <div className="input-group">
                <label>EXP DATE</label>
                <input type="text" placeholder="MM/YY" />
              </div>
            </div>
            <div className="total-price-box">
              <span>TOTAL</span>
              <span className="price-tag">
                {mentor?.price ? mentor.price.split("/")[0] : "$10"}
              </span>
            </div>
            <p className="payment-note">
              *Please complete payment within 30 minutes to secure your
              selection. After this time, you will need to start over.
            </p>
            <div className="popup-actions payment-actions-inline">
              <button className="popup-btn btn-book" onClick={onConfirm}>
                PAY
              </button>
              <button className="popup-btn btn-cancel" onClick={onCancel}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
const BookingPage = () => {
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false); // Quản lý đóng/mở

  const [activePopup, setActivePopup] = useState(null); // 'profile' | 'payment' | null
  const [selectedMentor, setSelectedMentor] = useState(null);

  const [notice, setNotice] = useState(null);
  const noticeTimeoutRef = useRef(null);
  const showNotice = (message) => {
    setNotice(message);
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
    }
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

  const handleGoToPayment = () => {
    setActivePopup("payment"); // Chuyển tiếp tới màn hình Payment
  };

  const handleCloseAllPopups = () => {
    setActivePopup(null);
    setSelectedMentor(null); // Reset dữ liệu khi quay về
  };

  return (
    <div className="dashboard-container">
      {/* CỘT 1: Navigation Bar */}
      <NavigationBar
        isCollapsed={navCollapsed}
        setIsCollapsed={setNavCollapsed}
      />

      <main className="dashboard-main">
        {notice && (
          <div className="booking-notice" key={notice}>
            <span className="notice-dash" />
            <span className="notice-text">{notice}</span>
            <span className="notice-dash" />
          </div>
        )}
        <BookingList
          navCollapsed={navCollapsed}
          chatCollapsed={chatCollapsed}
          onViewProfile={handleOpenProfile}
        />
      </main>

      {/* NÚT TRIGGER FIXED: Hiện lên lơ lửng khi thanh chat thu gọn */}
      {chatCollapsed && (
        <div
          className="chat-trigger-header"
          onClick={() => setChatCollapsed(false)}
        >
          <div className="chatbot-icon">
            <img src="/logo.png" alt="Chatbot Icon" />
          </div>
          <span className="user-name">John</span>
          <div className="user-avatar">
            <img src="/user.png" alt="User Avatar" />
          </div>
        </div>
      )}

      {/* CỘT 3: Chat Panel luôn render để chạy mượt Transition */}
      <ChatPanel
        isCollapsed={chatCollapsed}
        onClose={() => setChatCollapsed(true)}
      />
      {activePopup === "profile" && (
        <ProfilePopup
          mentor={selectedMentor}
          onBook={handleGoToPayment}
          onCancel={handleCloseAllPopups}
        />
      )}

      {activePopup === "payment" && (
        <PaymentPopup
          mentor={selectedMentor}
          onConfirm={() => {
            handleCloseAllPopups();
            showNotice("Booking successful! Please check your email.");
          }}
          onCancel={handleCloseAllPopups}
        />
      )}
    </div>
  );
};
export default BookingPage;
