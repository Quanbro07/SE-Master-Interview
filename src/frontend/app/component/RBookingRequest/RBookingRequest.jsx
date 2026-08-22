"use client";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RNavigationBar from "../RNavigationBar/RNavigationBar";
import "./RBookingRequest.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const getAccessToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const convertBookingToRequest = (booking) => {
  if (!booking) return null;

  const bookingId = booking.booking_id || booking.bookingId;
  const rawStatus = (
    booking.booking_status ||
    booking.bookingStatus ||
    booking.status ||
    ""
  )
    .toString()
    .toUpperCase();

  // 📝 LOG FULL BOOKING RESPONSE CHUẨN THEO DTO BACKEND
  console.log(`📋 [FULL BOOKING RESPONSE - ID #${bookingId}]:`, {
    booking_id: bookingId,
    booker: booking.booker || booking.bookerResponseDTO,
    interviewer: booking.interviewer || booking.interviewerResponseDTO,
    booking_status: rawStatus,
    meeting_id: booking.meeting_id || booking.meetingId,
    meeting_url: booking.meeting_url || booking.meetingUrl,
    meeting_password: booking.meeting_password || booking.meetingPassword,
    start_time: booking.start_time || booking.startTime,
    end_time: booking.end_time || booking.endTime,
    cv_url: booking.cv_url || booking.cvUrl,
  });

  // 1. Đọc cv_url từ backend response
  let rawCvUrl =
    booking.cv_url ||
    booking.cvUrl ||
    booking.booker?.cv_url ||
    booking.booker?.cvUrl ||
    null;

  // 2. Chuyển thành URL hoàn chỉnh
  let fullCvUrl = null;
  if (rawCvUrl && typeof rawCvUrl === "string" && rawCvUrl.trim() !== "") {
    if (rawCvUrl.startsWith("http://") || rawCvUrl.startsWith("https://")) {
      fullCvUrl = rawCvUrl;
    } else {
      const cleanPath = rawCvUrl.startsWith("/") ? rawCvUrl : `/${rawCvUrl}`;
      fullCvUrl = `${API_BASE}${cleanPath}`;
    }
  }

  // 3. Tách tên file
  let fileName = "Candidate_CV.pdf";
  if (fullCvUrl) {
    const segments = fullCvUrl.split("/");
    const lastSegment = segments[segments.length - 1].split("?")[0];
    if (lastSegment) fileName = decodeURIComponent(lastSegment);
  }

  const candidateName =
    booking.booker?.bookerName ||
    booking.booker?.booker_name ||
    booking.booker?.fullName ||
    booking.booker?.full_name ||
    booking.booker?.name ||
    `Candidate #${booking.booker?.booker_id || bookingId}`;

  const rawStartTime = booking.start_time || booking.startTime;
  const startTime = rawStartTime ? new Date(rawStartTime) : new Date();

  return {
    id: `booking-${bookingId}`,
    bookingId: bookingId,
    status: rawStatus,
    date: startTime.toLocaleDateString("en-GB"),
    time: startTime.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    interviewee: candidateName,
    about: "Interview Request",
    detail: {
      candidate: candidateName,
      requestDate: startTime.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      requestTime: `${startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} (GMT +7)`,
      message: "Interview booking request",
      cvUrl: fullCvUrl,
      cvFileName: fileName,
      meetingUrl: booking.meeting_url || booking.meetingUrl,
    },
  };
};

const BADGE_HOLD = 500;
const EXIT_DURATION = 320;

const RBookingRequest = () => {
  const [requests, setRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBookingRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    const headers = {
      "Content-Type": "application/json",
      ...authHeaders(),
    };

    try {
      // SỬA ĐỔI: Gọi filter=PENDING để chỉ lấy các Yêu cầu đang đợi Confirm/Reject
      const res = await fetch(
        `${API_BASE}/api/v1/booking/all-bookings?filter=PENDING`,
        {
          headers,
        },
      );

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const responseData = await res.json();

      console.log("📦 [RAW API RESPONSE FROM /all-bookings]:", responseData);

      const bookingsArray = Array.isArray(responseData)
        ? responseData
        : responseData.data ||
          responseData.content ||
          responseData.bookings ||
          [];

      if (!Array.isArray(bookingsArray)) {
        setRequests([]);
        return;
      }

      // SỬA ĐỔI: Lọc chỉ lấy các Booking có trạng thái PENDING
      const validBookings = bookingsArray.filter((b) => {
        const status = (b.booking_status || b.bookingStatus || b.status || "")
          .toString()
          .toUpperCase();
        return status === "PENDING";
      });

      const convertedRequests = validBookings
        .map((b) => convertBookingToRequest(b))
        .filter((r) => r !== null);

      setRequests(convertedRequests);
    } catch (err) {
      console.error("❌ [FETCH ERROR]:", err);
      setError(err.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookingRequests();
  }, [loadBookingRequests]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDecision = (id, decision) => {
    const target = requests.find((r) => r.id === id);
    if (!target || target.decision) return;

    const bookingId = target.bookingId;
    const isAccept = decision === "accepted";

    setExpandedId((prev) => (prev === id ? null : prev));

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, decision } : r)),
    );

    setTimeout(() => {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, exiting: decision } : r)),
      );

      setTimeout(async () => {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        setToast({ name: target.interviewee, decision });
        setTimeout(() => setToast(null), 2200);

        try {
          const endpoint = isAccept
            ? `${API_BASE}/api/v1/booking/${bookingId}/confirm`
            : `${API_BASE}/api/v1/booking/${bookingId}/reject`;

          const token = getAccessToken();
          if (!token) {
            throw new Error("Missing access token. Please login again.");
          }

          const headers = {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          };

          const bodyData = isAccept
            ? JSON.stringify({
                meeting_topic: "Interview",
                meeting_password: "123",
              })
            : JSON.stringify({});

          const res = await fetch(endpoint, {
            method: "POST",
            headers,
            body: bodyData,
          });

          if (!res.ok) {
            const errorRes = await res.json().catch(() => ({}));
            console.error(
              "❌ Response error from backend:",
              res.status,
              errorRes,
            );
            setError(
              errorRes.message ||
                `Failed to ${isAccept ? "confirm" : "reject"} booking (${res.status})`,
            );
          } else {
            setTimeout(() => loadBookingRequests(), 500);
          }
        } catch (err) {
          console.error("❌ [DECISION ERROR]:", err);
          setError(err.message);
          setTimeout(() => loadBookingRequests(), 500);
        }
      }, EXIT_DURATION);
    }, BADGE_HOLD);
  };

  return (
    <div className="rbr-root">
      <RNavigationBar />
      <main className="rbr-main">
        <section className="rbr-inner">
          <h1 className="rbr-title">-----REQUESTS-----</h1>
          <p className="rbr-subtitle">REQUESTS' INFORMATION</p>

          {error && (
            <div className="rbr-error-message">
              {error}
              <button onClick={() => setError(null)} className="error-close">
                ✕
              </button>
            </div>
          )}

          {loading && (
            <div className="rbr-loading">Loading booking requests...</div>
          )}

          {!loading && (
            <div className="rbr-table">
              <div className="rbr-row rbr-header">
                <span>DATE</span>
                <span>TIME</span>
                <span>INTERVIEWEE</span>
                <span>ABOUT</span>
                <span className="rbr-header-view"> </span>
                <span className="rbr-header-actions">
                  <span>Accept</span>
                  <span>Deny</span>
                </span>
              </div>

              <AnimatePresence>
                {requests.map((req) => {
                  const isOpen = expandedId === req.id;
                  return (
                    <motion.div
                      key={req.id}
                      layout
                      initial={{ opacity: 1, x: 0 }}
                      animate={
                        req.exiting
                          ? { opacity: 0, x: -140 }
                          : { opacity: 1, x: 0 }
                      }
                      exit={{ opacity: 0, x: -140 }}
                      transition={{
                        duration: EXIT_DURATION / 1000,
                        ease: "easeInOut",
                      }}
                      className={`rbr-row-wrap ${req.exiting ? `is-${req.exiting}` : ""}`}
                    >
                      <div className="rbr-row rbr-data-row">
                        <span className="cell-date">{req.date}</span>
                        <span className="cell-time">{req.time}</span>
                        <span className="cell-interviewee">
                          {req.interviewee}
                        </span>
                        <span className="cell-about">{req.about}</span>

                        <span className="cell-view">
                          <button
                            type="button"
                            className={`view-request-btn ${isOpen ? "is-open" : ""}`}
                            onClick={() => toggleExpand(req.id)}
                          >
                            View request
                            <span className="view-request-caret">▾</span>
                          </button>
                        </span>

                        <span className="cell-actions">
                          {req.decision ? (
                            <span className={`decision-badge ${req.decision}`}>
                              {req.decision === "accepted"
                                ? "ACCEPTED"
                                : "DENIED"}
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="round-btn accept-btn"
                                onClick={() =>
                                  handleDecision(req.id, "accepted")
                                }
                                aria-label="Accept request"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                className="round-btn deny-btn"
                                onClick={() => handleDecision(req.id, "denied")}
                                aria-label="Deny request"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </span>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="detail"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              duration: 0.28,
                              ease: "easeInOut",
                            }}
                            className="rbr-detail-wrap"
                          >
                            <motion.div
                              initial={{ y: -8 }}
                              animate={{ y: 0 }}
                              exit={{ y: -8 }}
                              transition={{
                                duration: 0.28,
                                ease: "easeInOut",
                              }}
                              className="rbr-detail-panel"
                            >
                              <div className="detail-top-row">
                                <div className="detail-field">
                                  <span className="detail-label">
                                    Candidate
                                  </span>
                                  <div className="detail-pill">
                                    {req.detail.candidate}
                                  </div>
                                </div>
                                <div className="detail-field">
                                  <span className="detail-label">Date</span>
                                  <div className="detail-pill">
                                    {req.detail.requestDate}
                                  </div>
                                </div>
                                <div className="detail-field">
                                  <span className="detail-label">Time</span>
                                  <div className="detail-pill">
                                    {req.detail.requestTime}
                                  </div>
                                </div>
                              </div>

                              <div className="detail-message-row">
                                <div className="detail-message-field">
                                  <span className="detail-label">Message</span>
                                  <div className="detail-message-box">
                                    {req.detail.message}
                                  </div>
                                </div>

                                {req.detail.cvUrl ? (
                                  <a
                                    href={req.detail.cvUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="detail-cv-card"
                                    style={{
                                      textDecoration: "none",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <span className="cv-icon">PDF</span>
                                    <span
                                      className="cv-filename"
                                      title={req.detail.cvFileName}
                                    >
                                      {req.detail.cvFileName}
                                    </span>
                                    <span
                                      className="cv-filesize"
                                      style={{ color: "#4caf50" }}
                                    >
                                      Click to View CV ↗
                                    </span>
                                  </a>
                                ) : (
                                  <div className="detail-cv-card">
                                    <span className="cv-icon">PDF</span>
                                    <span className="cv-filename">
                                      No CV Uploaded
                                    </span>
                                    <span className="cv-filesize">N/A</span>
                                  </div>
                                )}
                              </div>

                              <p className="detail-note">
                                Please respond within 2 days to avoid automatic
                                cancellation and fund release.
                              </p>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {requests.length === 0 && (
                <motion.div
                  className="rbr-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  No pending booking requests right now.
                </motion.div>
              )}
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={`rbr-toast ${toast.decision}`}
          >
            {toast.decision === "accepted" ? "Accepted" : "Denied"} request from{" "}
            {toast.name}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RBookingRequest;
