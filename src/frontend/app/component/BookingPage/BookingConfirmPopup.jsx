"use client";
import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { uploadCvBooking } from "./uploadCv";
import "./BookingConfirmPopup.css";

const API_BASE = "http://localhost:8080";

// Dùng hằng số key cấu hình chuẩn
const STRIPE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISH_KEY ||
  "pk_test_51TjVlBJgJLPmlDt7xWK27l0viRZ4BKqExlAkxKGvnjQ2haeLprJETBNMTGCrzcchlGokUrspQUXwJOst5FYR7oox008y7MVjCc";
const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;

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

// Component xử lý xác nhận thanh toán Stripe
const StripePaymentForm = ({ bookingId, onPaid, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState(null);

  const getAccessToken = () => {
    if (typeof window === "undefined") return "";
    const keys = ["accessToken", "token", "jwt", "authToken", "access_token"];
    let token = "";
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val) {
        token = val;
        break;
      }
    }
    if (!token) return "";

    return token
      .replace(/^"(.*)"$/, "$1")
      .trim()
      .replace(/^Bearer\s+/i, "");
  };

  useEffect(() => {
    if (!bookingId) return;

    const token = getAccessToken();
    const eventSource = new EventSource(
      `${API_BASE}/api/v1/stripe/${bookingId}/payment-stream?token=${encodeURIComponent(token)}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("<-- [SSE EVENT RECEIVED]:", data);
        if (data.status === "PAID" || data.status === "SUCCESS") {
          eventSource.close();
          onPaid(data);
        }
      } catch (err) {
        console.error("Lỗi đọc SSE Event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE Stream disconnected/closed:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [bookingId, onPaid]);

  const handlePay = async (e) => {
    if (e) e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setPayError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      console.error("<-- [STRIPE ERROR]:", error);
      setPayError(error.message || "Thanh toán thất bại. Vui lòng thử lại.");
      setProcessing(false);
      return;
    }

    if (
      paymentIntent &&
      (paymentIntent.status === "succeeded" ||
        paymentIntent.status === "requires_capture")
    ) {
      onPaid(paymentIntent);
    } else {
      setPayError("Thanh toán chưa hoàn tất hoặc đang chờ xử lý.");
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handlePay} className="stripe-payment-form">
      <PaymentElement />
      {payError && (
        <p
          className="booking-error"
          style={{ color: "red", marginTop: "10px" }}
        >
          {payError}
        </p>
      )}
      <div
        className="popup-actions payment-actions-inline"
        style={{ marginTop: "20px", display: "flex", gap: "10px" }}
      >
        <button
          type="submit"
          className="popup-btn btn-book"
          disabled={!stripe || processing}
          style={{ flex: 1 }}
        >
          {processing ? "ĐANG XỬ LÝ..." : "THANH TOÁN NGAY"}
        </button>
        <button
          type="button"
          className="popup-btn btn-cancel"
          onClick={onCancel}
          disabled={processing}
          style={{ flex: 1 }}
        >
          HỦY BỎ
        </button>
      </div>
    </form>
  );
};

// Component chính BookingConfirmPopup
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
        const rawToken =
          localStorage.getItem("accessToken") ||
          localStorage.getItem("token") ||
          localStorage.getItem("jwt");
        const cleanToken = rawToken
          ? rawToken.trim().replace(/^Bearer\s+/i, "")
          : "";

        const res = await fetch(
          `${API_BASE}/api/v1/schedule/get?interviewerId=${mentor.id}&dateInWeek=${dateStr}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cleanToken}`,
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

        const blockedList = data.blockedSchedules || [];
        const finalAvailableSlots = validSlots.filter((slot) => {
          const slotStart = new Date(
            `${dateStr}T${String(slot.startHour).padStart(2, "0")}:00:00`,
          );
          const slotEnd = new Date(
            `${dateStr}T${String(slot.startHour + 1).padStart(2, "0")}:00:00`,
          );
          return !blockedList.some(
            (b) =>
              slotStart < new Date(b.endTime) &&
              slotEnd > new Date(b.startTime),
          );
        });

        setAvailableTimeSlots(finalAvailableSlots);
        if (finalAvailableSlots.length > 0)
          setSelectedSlot(finalAvailableSlots[0]);
      } catch (err) {
        console.error("Lỗi lấy lịch rảnh:", err);
        setAvailableTimeSlots([]);
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchInterviewerSchedule();
  }, [selectedDate, mentor]);

  const handleFileChange = (e) => setCvFile(e.target.files?.[0] || null);

  const handleSubmitBooking = async (e) => {
    if (e) e.preventDefault();
    if (!cvFile) {
      setSubmitError("Vui lòng tải CV trước khi xác nhận.");
      return;
    }
    if (!selectedSlot) {
      setSubmitError("Vui lòng chọn khung giờ trống.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const rawToken =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt");
      const cleanToken = rawToken
        ? rawToken.trim().replace(/^Bearer\s+/i, "")
        : "";
      const authHeader = `Bearer ${cleanToken}`;

      const formattedDate = formatDateForBackend(selectedDate);
      const startDateTime = `${formattedDate} ${selectedSlot.start}:00`;
      const endDateTime = `${formattedDate} ${selectedSlot.end}:00`;

      const bookingPayload = {
        interviewer_id: mentor?.id,
        position_name:
          mentor?.displayPosition || mentor?.position || "SOFTWARE ENGINEER",
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
            Authorization: authHeader,
          },
          body: JSON.stringify(bookingPayload),
        },
      );

      if (!res.ok) throw new Error("Tạo booking thất bại");
      const booking = await res.json();
      const bookingId = booking?.booking_id;
      if (!bookingId) throw new Error("Không tìm thấy bookingId!");

      const uploadedCvUrl = await uploadCvBooking(bookingId, cvFile);
      if (!uploadedCvUrl) throw new Error("Tải CV lên thất bại.");

      setCreatedBooking({ ...booking, bookingId, cvUrl: uploadedCvUrl });

      const intentUrl = `${API_BASE}/api/v1/stripe/${bookingId}/create-intent`;
      const intentRes = await fetch(intentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      });

      if (!intentRes.ok)
        throw new Error(`Khởi tạo Stripe thất bại (HTTP ${intentRes.status})`);

      const intentData = await intentRes.json();
      const secret = intentData.client_secret || intentData.clientSecret;
      if (!secret)
        throw new Error("Không nhận được clientSecret từ Stripe Backend.");

      setClientSecret(secret);
      setStep("payment");
    } catch (err) {
      console.error("Lỗi Booking:", err);
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
          {/* CỘT TRÁI: LỊCH VÀ SLOTS */}
          <div className="payment-schedule">
            <h3 className="popup-title">Book Interview with {mentor?.name}</h3>
            <div className="calendar-controls">
              <button
                type="button"
                className="calendar-nav-button"
                onClick={() => handleMoveMonth(-1)}
                disabled={!canMovePrevious || step === "payment"}
              >
                ‹
              </button>
              <div className="calendar-header">{monthLabel}</div>
              <button
                type="button"
                className="calendar-nav-button"
                onClick={() => handleMoveMonth(1)}
                disabled={step === "payment"}
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
                    disabled={!date || disabled || step === "payment"}
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
                    Đang tải lịch rảnh...
                  </div>
                ) : availableTimeSlots.length === 0 ? (
                  <div className="time-slots-empty">
                    Không có giờ rảnh trong ngày này
                  </div>
                ) : (
                  availableTimeSlots.map((slot) => (
                    <button
                      type="button"
                      key={slot.label}
                      className={`slot-btn ${selectedSlot?.label === slot.label ? "selected" : ""}`}
                      onClick={() => setSelectedSlot(slot)}
                      disabled={step === "payment"}
                    >
                      {slot.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: BOOKING / PAYMENT */}
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
                    {submitting ? "PROCESSING..." : "TO PAYMENT"}
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
              </>
            )}

            {step === "payment" && clientSecret && (
              <>
                <h3 className="popup-title">Stripe Payment</h3>
                <div
                  className="booking-summary"
                  style={{ marginBottom: "15px" }}
                >
                  <div className="summary-row">
                    <span className="summary-label">Total Amount</span>
                    <span className="summary-value">
                      {mentor?.price || "$10 / session"}
                    </span>
                  </div>
                </div>

                {stripePromise ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: { theme: "night" },
                      fields: {
                        billingDetails: {
                          address: {
                            postalCode: "never", // Tắt bắt buộc nhập ZIP Code khi test
                          },
                        },
                      },
                    }}
                  >
                    <StripePaymentForm
                      bookingId={createdBooking?.bookingId}
                      onPaid={handlePaymentSuccess}
                      onCancel={onCancel}
                    />
                  </Elements>
                ) : (
                  <p style={{ color: "red" }}>
                    Chưa tìm thấy Stripe Publishable Key. Vui lòng kiểm tra lại
                    cấu hình env.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmPopup;
