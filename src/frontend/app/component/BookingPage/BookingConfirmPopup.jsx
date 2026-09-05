"use client";
import React, { useState, useEffect } from "react";
import { uploadCvBooking } from "./uploadCv";
import Toast from "../Toast/Toast";
import "./BookingConfirmPopup.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const getAccessToken = () => {
  if (typeof window === "undefined") return "";
  const keys = ["accessToken", "token", "jwt", "authToken", "access_token"];
  let rawToken = "";
  for (const key of keys) {
    const val = localStorage.getItem(key);
    if (val && val !== "undefined" && val !== "null") {
      rawToken = val;
      break;
    }
  }
  if (!rawToken) return "";
  return rawToken
    .replace(/^"+|"+$/g, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
};

const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
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

  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [cvFile, setCvFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

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
  for (let i = 0; i < firstWeekdayIndex; i += 1) dayCells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    dayCells.push(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
    );
  }

  const isDateDisabled = (date) => !date || normalizeDate(date) < todayStart;

  const formatDateForBackend = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getDbDayOfWeek = (date) => {
    const day = date.getDay();
    return day === 0 ? 8 : day + 1;
  };

  useEffect(() => {
    if (!mentor?.id) return;

    const fetchInterviewerSchedule = async () => {
      setLoadingSchedule(true);
      setSelectedSlot(null);
      try {
        const dateStr = formatDateForBackend(selectedDate);

        const res = await fetch(
          `${API_BASE}/api/v1/schedule/get?interviewerId=${mentor.id}&dateInWeek=${dateStr}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...authHeaders(),
            },
          },
        );

        if (!res.ok) throw new Error("Failed to fetch schedule");

        const data = await res.json();
        const targetDayOfWeek = getDbDayOfWeek(selectedDate);
        const daySchedule = (data.schedules || []).find(
          (s) => s.day_of_week === targetDayOfWeek,
        );

        let validSlots = [];
        if (daySchedule && daySchedule.schedule_times) {
          daySchedule.schedule_times.forEach((range) => {
            const startH = parseInt(range.start_time.split(":")[0], 10);
            const endH = parseInt(range.end_time.split(":")[0], 10);

            for (let h = startH; h < endH; h++) {
              const startStr = `${String(h).padStart(2, "0")}:00`;
              const endStr = `${String(h + 1).padStart(2, "0")}:00`;
              validSlots.push({
                label: `${startStr}-${endStr}`,
                start: startStr,
                end: endStr,
                startHour: h,
              });
            }
          });
        }

        // ✅ KHAI BÁO BIẾN THỜI GIAN HIỆN TẠI ĐỂ DÙNG FILTER LỖI
        const now = new Date();
        const isSelectedToday = isSameDate(selectedDate, now);
        const blockedList = data.blockedSchedules || [];

        const finalAvailableSlots = validSlots.filter((slot) => {
          const slotStart = new Date(
            `${dateStr}T${String(slot.startHour).padStart(2, "0")}:00:00`,
          );
          const slotEnd = new Date(
            `${dateStr}T${String(slot.startHour + 1).padStart(2, "0")}:00:00`,
          );

          // 1. Loại bỏ khung giờ bị Block
          const isBlocked = blockedList.some(
            (b) =>
              slotStart < new Date(b.endTime) &&
              slotEnd > new Date(b.startTime),
          );
          if (isBlocked) return false;

          // 2. Loại bỏ khung giờ trong quá khứ nếu chọn ngày hôm nay
          if (isSelectedToday && slotStart < now) {
            return false;
          }

          return true;
        });

        // ✅ SET STATE DUY NHẤT 1 LẦN (Đã sửa lỗi trùng lặp)
        setAvailableTimeSlots(finalAvailableSlots);
        if (finalAvailableSlots.length > 0) {
          setSelectedSlot(finalAvailableSlots[0]);
        } else {
          setSelectedSlot(null);
        }
      } catch (err) {
        console.error("Fetch schedule error:", err);
        setAvailableTimeSlots([]);
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchInterviewerSchedule();
  }, [selectedDate, mentor]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setCvFile(file);
    if (file) {
      showToast(`Selected CV file: ${file.name}`, "success");
    }
  };

  const handleSubmitBooking = async (e) => {
    if (e) e.preventDefault();
    if (!cvFile) {
      setSubmitError("Please upload your CV before confirming.");
      showToast("Please upload your CV before confirming.", "error");
      return;
    }
    if (!selectedSlot) {
      setSubmitError("Please select an available time slot.");
      showToast("Please select an available time slot.", "error");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const formattedDate = formatDateForBackend(selectedDate);
      const startDateTime = `${formattedDate} ${selectedSlot.start}:00`;
      const endDateTime = `${formattedDate} ${selectedSlot.end}:00`;

      const rawPosition =
        mentor?.displayPosition || mentor?.position || "SOFTWARE ENGINEER";

      const bookingPayload = {
        interviewer_id: mentor?.id,
        position_name: rawPosition,
        start_date: startDateTime,
        end_date: endDateTime,
        note: "Interview Booking",
      };

      const res = await fetch(
        `${API_BASE}/api/v1/booking/booking-interviewer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify(bookingPayload),
        },
      );

      if (!res.ok) throw new Error("Booking creation failed");
      const booking = await res.json();
      const bookingId = booking?.booking_id;
      if (!bookingId) throw new Error("bookingId not found!");

      const uploadedCvUrl = await uploadCvBooking(bookingId, cvFile);
      if (!uploadedCvUrl) throw new Error("CV upload failed.");

      showToast("Booking request and CV uploaded successfully!", "success");

      setTimeout(() => {
        if (onConfirm) {
          onConfirm({ ...booking, bookingId, cvUrl: uploadedCvUrl });
        }
      }, 1200);
    } catch (err) {
      console.error("Booking Error:", err);
      const errText = err.message || "An error occurred. Please try again.";
      setSubmitError(errText);
      showToast(errText, "error");
    } finally {
      setSubmitting(false);
    }
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
                    className={`calendar-day ${!date ? "empty" : disabled ? "disabled" : ""} ${selected ? "active" : ""}`}
                    onClick={() => date && !disabled && setSelectedDate(date)}
                    disabled={!date || disabled}
                  >
                    {date ? date.getDate() : ""}
                  </button>
                );
              })}
            </div>
            <div className="time-slots-section">
              <h4>Available time</h4>
              <div className="time-slots-grid">
                {loadingSchedule ? (
                  <div className="time-slots-loading">
                    Loading available slots...
                  </div>
                ) : availableTimeSlots.length === 0 ? (
                  <div className="time-slots-empty">
                    No available time slots on this date
                  </div>
                ) : (
                  availableTimeSlots.map((slot) => (
                    <button
                      type="button"
                      key={slot.label}
                      className={`slot-btn ${selectedSlot?.label === slot.label ? "selected" : ""}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="payment-form-details">
            <h3 className="popup-title">Booking Details</h3>
            <div className="booking-summary">
              <div className="summary-row">
                <span className="summary-label">Interviewer</span>
                <span className="summary-value">{mentor?.name}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Position</span>
                <span
                  className="summary-value"
                  style={{ textTransform: "uppercase" }}
                >
                  {mentor?.displayPosition ||
                    mentor?.position ||
                    "SOFTWARE ENGINEER"}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Date</span>
                <span className="summary-value">
                  {formatDateForBackend(selectedDate)}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Time</span>
                <span className="summary-value">
                  {selectedSlot ? selectedSlot.label : "--:--"}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Fee</span>
                <span className="summary-value">
                  {mentor?.price || "$10 / session"}
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
                type="button"
                className="popup-btn btn-book"
                onClick={handleSubmitBooking}
                disabled={submitting}
              >
                {submitting ? "PROCESSING..." : "CONFIRM"}
              </button>
              <button
                type="button"
                className="popup-btn btn-cancel"
                onClick={onCancel}
                disabled={submitting}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
};

export default BookingConfirmPopup;
