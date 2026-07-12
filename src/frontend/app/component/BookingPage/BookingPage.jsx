"use client";
import NavigationBar from "../NavigationBar/NavigationBar";
import ChatPanel from "../ChatPanel/ChatPanel";
import BookingList from "../BookingList/BookingList";
import React, { useState, useRef, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import "./BookingPage.css";

// TODO: confirm this matches wherever the backend is actually reachable
// from the browser (same value used across CV Assessment / Feedback pages).
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// TODO: set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your real Stripe publishable key.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

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

// Time slots as [start, end] pairs — these map directly onto
// Booking.startTime / Booking.endTime (LocalTime, "HH:mm" is a valid
// ISO_LOCAL_TIME string Jackson/Spring will parse without seconds).
const availableTimeSlots = [
  { label: "07:00-08:00", start: "07:00", end: "08:00" },
  { label: "14:30-15:30", start: "14:30", end: "15:30" },
  { label: "20:00-21:00", start: "20:00", end: "21:00" },
];

// Parses a display string like "$15.5/ session" into a Stripe-ready amount
// (integer, smallest currency unit — cents for USD).
// TODO: replace with a real price coming from the backend once available;
// this is derived from mock display data (BookingList's mockMentors).
const parsePriceToCents = (priceLabel) => {
  if (!priceLabel) return 1000; // fallback: $10.00
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
          {processing ? "PROCESSING..." : "PAY"}
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

  // step: "booking" -> collecting date/time/CV, "payment" -> Stripe Elements
  const [step, setStep] = useState("booking");
  const [createdBooking, setCreatedBooking] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);

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
    // LocalDate expects "yyyy-MM-dd"
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handleFileChange = (e) => {
    setCvFile(e.target.files?.[0] || null);
  };

  const handleSubmitBooking = async () => {
    if (!cvFile) {
      setSubmitError("Please upload your CV before confirming.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);

    try {
      // TODO: replace with your real CV upload endpoint. This should return
      // the URL that gets stored in Booking.cvUrl.
      const cvFormData = new FormData();
      cvFormData.append("file", cvFile);
      const uploadRes = await fetch(`${API_BASE}/api/uploads/cv`, {
        method: "POST",
        body: cvFormData,
      });
      if (!uploadRes.ok) throw new Error("CV upload failed");
      const { url: cvUrl } = await uploadRes.json();

      // Booking payload — every field here has a direct match on the
      // Booking entity. meetingUrl/meetingPassword/status/createdAt are
      // left out because they're set server-side, not by the client.
      const bookingPayload = {
        bookingDate: formatDateForBackend(selectedDate),
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        cvUrl,
        interviewerId: mentor?.id, // maps to Booking.interviewer
        // TODO: positionId — needs a real Position id once that entity/
        // endpoint is available; mentor.role is just a display label today.
        // TODO: bookerId — should come from the logged-in user's session/
        // auth context, not be hardcoded.
      };

      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });
      if (!res.ok) throw new Error("Booking request failed");
      const booking = await res.json();
      setCreatedBooking(booking);

      // Create a Stripe PaymentIntent for this booking.
      // TODO: confirm this endpoint path and response shape against your
      // actual PaymentController.
      const amount = parsePriceToCents(mentor?.price);
      const intentRes = await fetch(
        `${API_BASE}/api/bookings/${booking.bookingId}/payment-intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, currency: "usd" }),
        },
      );
      if (!intentRes.ok) throw new Error("Could not start payment");
      const { clientSecret: secret } = await intentRes.json();
      setClientSecret(secret);

      setStep("payment");
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
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

          {/* Cột phải: Booking details, sau đó Payment */}
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
                    {submitting ? "BOOKING..." : "PAYMENT"}
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
                <h3 className="popup-title">Payment</h3>
                <div className="booking-summary">
                  <div className="summary-row">
                    <span className="summary-label">Amount</span>
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
  const [chatCollapsed, setChatCollapsed] = useState(false); // Quản lý đóng/mở

  const [activePopup, setActivePopup] = useState(null); // 'profile' | 'confirm' | null
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

  const handleGoToConfirm = () => {
    setActivePopup("confirm");
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
          onBook={handleGoToConfirm}
          onCancel={handleCloseAllPopups}
        />
      )}

      {activePopup === "confirm" && (
        <BookingConfirmPopup
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
