"use client";
import NavigationBar from "../NavigationBar/NavigationBar";
import ChatPanel from "../ChatPanel/ChatPanel";
import BookingList from "../BookingList/BookingList";
import UserHeader from "../UserHeader/UserHeader";
import React, { useState, useRef, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import "./BookingPage.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Khởi tạo Stripe instance với public key từ file .env
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

// Helper lấy thông tin người dùng từ localStorage
const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

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
            <img src={mentor.avatar || "/user.png"} alt={mentor.name} />
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

const availableTimeSlots = [
  { label: "07:00-08:00", start: "07:00", end: "08:00" },
  { label: "14:30-15:30", start: "14:30", end: "15:30" },
  { label: "20:00-21:00", start: "20:00", end: "21:00" },
];

const parsePriceToCents = (priceLabel) => {
  if (!priceLabel) return 1000;
  const match = priceLabel.match(/[\d.]+/);
  const dollars = match ? parseFloat(match[0]) : 10;
  return Math.round(dollars * 100);
};

const StripePaymentForm = ({ onPaid, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    setPayError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setPayError(error.message || "Payment failed. Please try again.");
      setProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      onPaid(paymentIntent);
    } else {
      setPayError("Payment did not complete. Please try again.");
    }
    setProcessing(false);
  };

  return (
    <div>
      <PaymentElement />
      {payError && <p className="booking-error">{payError}</p>}
      <div className="popup-actions payment-actions-inline">
        <button
          className="popup-btn btn-book"
          onClick={handlePay}
          disabled={!stripe || processing}
        >
          {processing ? "PROCESSING..." : "PAY NOW"}
        </button>
        <button
          className="popup-btn btn-cancel"
          onClick={onCancel}
          disabled={processing}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
};

const BookingConfirmPopup = ({ mentor, onConfirm, onCancel }) => {
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
  const [selectedSlot, setSelectedSlot] = useState(availableTimeSlots[0]);
  const [cvFile, setCvFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [step, setStep] = useState("booking");
  const [createdBooking, setCreatedBooking] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);

  const monthLabel = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  const monthStartDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();
  const firstWeekdayIndex = (monthStartDay + 6) % 7;
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();

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

  const formatDateForBackend = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handleFileChange = (e) => {
    setCvFile(e.target.files?.[0] || null);
  };

  const handleSubmitBooking = async (e) => {
    if (e) e.preventDefault();
    if (!cvFile) {
      setSubmitError("Please upload your CV before confirming.");
      return;
    }

    // 1. Lấy token từ LocalStorage
    let rawToken =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("auth_token");

    if (!rawToken) {
      try {
        const userObj = JSON.parse(localStorage.getItem("user") || "{}");
        rawToken = userObj.token || userObj.accessToken || userObj.jwt;
      } catch (err) {
        console.error(err);
      }
    }

    if (!rawToken || rawToken === "undefined" || rawToken === "null") {
      setSubmitError(
        "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!",
      );
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return;
    }

    // 2. Tẩy sạch chữ Bearer thừa và khoảng trắng
    const cleanToken = rawToken.trim().replace(/^Bearer\s+/i, "");

    // 3. Tạo Header CHUẨN duy nhất 1 chữ Bearer
    const authHeader = `Bearer ${cleanToken}`;

    console.log("👉 Token tìm thấy:", cleanToken);
    console.log("👉 Authorization Header chuẩn gửi đi:", authHeader);

    setSubmitError(null);
    setSubmitting(true);

    try {
      // 1. Upload CV
      const cvFormData = new FormData();
      cvFormData.append("file", cvFile);

      const uploadRes = await fetch(`${API_BASE}/api/v1/uploads/cv`, {
        method: "POST",
        headers: {
          Authorization: authHeader, // 👈 Đã dùng Header chuẩn
        },
        body: cvFormData,
      });

      if (uploadRes.status === 401) {
        throw new Error(
          "Phiên đăng nhập không hợp lệ (401). Vui lòng đăng nhập lại.",
        );
      }

      if (!uploadRes.ok) {
        throw new Error("Upload CV thất bại. Vui lòng thử lại.");
      }

      const uploadData = await uploadRes.json();
      const cvUrl = uploadData.url;

      // 2. Tạo Booking
      const bookingPayload = {
        bookingDate: formatDateForBackend(selectedDate),
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        cvUrl,
        interviewerId: mentor?.id,
      };

      const res = await fetch(`${API_BASE}/api/v1/booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(bookingPayload),
      });

      if (res.status === 401) {
        throw new Error(
          "Không có quyền tạo lịch (401). Vui lòng đăng nhập lại.",
        );
      }

      if (!res.ok) throw new Error("Tạo lịch thất bại!");

      const booking = await res.json();
      setCreatedBooking(booking);

      // 3. Lấy PaymentIntent từ Stripe
      const amount = parsePriceToCents(mentor?.price);
      const intentRes = await fetch(
        `${API_BASE}/api/v1/booking/${booking.bookingId || booking.id}/payment-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({ amount, currency: "usd" }),
        },
      );

      if (!intentRes.ok)
        throw new Error("Không thể khởi tạo thanh toán Stripe");
      const { clientSecret: secret } = await intentRes.json();
      setClientSecret(secret);

      setStep("payment");
    } catch (err) {
      setSubmitError(err.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };
  const handlePaymentSuccess = (paymentIntent) => {
    if (onConfirm) onConfirm({ booking: createdBooking, paymentIntent });
  };

  return (
    <div className="popup-overlay" onClick={onCancel}>
      <div
        className="popup-content payment-popup-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="payment-grid">
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
                    disabled={!date || disabled || step === "payment"}
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
                  {availableTimeSlots.map((slot) => (
                    <button
                      type="button"
                      key={slot.label}
                      className={`slot-btn ${
                        selectedSlot.label === slot.label ? "selected" : ""
                      }`}
                      onClick={() => setSelectedSlot(slot)}
                      disabled={step === "payment"}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="payment-form-details">
            {step === "booking" && (
              <>
                <h3 className="popup-title">Booking Details</h3>

                <div className="booking-summary">
                  <div className="summary-row">
                    <span className="summary-label">Interviewer</span>
                    <span className="summary-value">{mentor?.name}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Date</span>
                    <span className="summary-value">
                      {formatDateForBackend(selectedDate)}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Time</span>
                    <span className="summary-value">{selectedSlot.label}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Fee</span>
                    <span className="summary-value">
                      {mentor?.price || "$10/ session"}
                    </span>
                  </div>
                </div>

                <div className="input-group cv-upload-group">
                  <label>CV (required)</label>
                  <label className="cv-upload-dropzone">
                    {cvFile ? cvFile.name : "Click to upload your CV"}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      hidden
                    />
                  </label>
                </div>

                {submitError && <p className="booking-error">{submitError}</p>}

                <div className="popup-actions payment-actions-inline">
                  <button
                    className="popup-btn btn-book"
                    onClick={handleSubmitBooking}
                    disabled={submitting}
                  >
                    {submitting ? "PROCESSING..." : "TO PAYMENT"}
                  </button>
                  <button
                    className="popup-btn btn-cancel"
                    onClick={onCancel}
                    disabled={submitting}
                  >
                    CANCEL
                  </button>
                </div>
              </>
            )}

            {step === "payment" && clientSecret && (
              <>
                <h3 className="popup-title">Stripe Payment</h3>
                <div className="booking-summary">
                  <div className="summary-row">
                    <span className="summary-label">Total Amount</span>
                    <span className="summary-value">
                      {mentor?.price || "$10/ session"}
                    </span>
                  </div>
                </div>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripePaymentForm
                    onPaid={handlePaymentSuccess}
                    onCancel={onCancel}
                  />
                </Elements>
              </>
            )}
          </div>
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

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

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

  const handleGoToConfirm = () => {
    setActivePopup("confirm");
  };

  const handleCloseAllPopups = () => {
    setActivePopup(null);
    setSelectedMentor(null);
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

      <ChatPanel isCollapsed={chatCollapsed} />

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
              "Booking & Payment Successful! Check your email for details.",
            );
          }}
          onCancel={handleCloseAllPopups}
        />
      )}
    </div>
  );
};

export default BookingPage;
