"use client";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RNavigationBar from "../RNavigationBar/RNavigationBar";
import "./RBookingRequest.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const getAccessToken = () => {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token") ||
    ""
  );
};

const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };
};

// Convert backend booking to frontend format
const convertBookingToRequest = (booking) => {
  if (!booking || booking.booking_status !== "PENDING") return null;

  const startTime = new Date(booking.start_time);
  const dateStr = startTime.toLocaleDateString("en-GB"); // DD/MM/YYYY
  const timeStr = startTime.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    id: `booking-${booking.booking_id}`,
    bookingId: booking.booking_id,
    date: dateStr,
    time: timeStr,
    interviewee: booking.booker?.full_name || "Unknown",
    about: booking.booker?.position || "Interview",
    detail: {
      candidate: booking.booker?.full_name || "Unknown",
      requestDate: startTime.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      requestTime: `${startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} (GMT +7)`,
      message: booking.booker?.bio || "Interview request",
      cvFileName: booking.cv_url ? booking.cv_url.split("/").pop() : "CV.pdf",
      cvFileSize: "N/A",
    },
  };
};

const BADGE_HOLD = 500; // ms the ACCEPTED/DENIED badge stays visible before swiping out
const EXIT_DURATION = 320; // ms swipe-left/fade duration

const RBookingRequest = () => {
  const [requests, setRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load pending booking requests from backend
  const loadBookingRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/booking/all-bookings?filter=PENDING`,
        {
          headers: authHeaders(),
        },
      );
      if (!res.ok) throw new Error(`Failed to load requests (${res.status})`);
      const bookings = await res.json();

      const convertedRequests = (Array.isArray(bookings) ? bookings : [])
        .map((b) => convertBookingToRequest(b))
        .filter((r) => r !== null);

      setRequests(convertedRequests);
      localStorage.setItem("interviewerBookings", JSON.stringify(bookings));
    } catch (err) {
      console.error("Error loading requests:", err);
      setError(err.message || "Failed to load requests");

      try {
        const cached = localStorage.getItem("interviewerBookings");
        if (cached) {
          const bookings = JSON.parse(cached);
          const pending = bookings.filter(
            (b) => b.booking_status === "PENDING",
          );
          const convertedRequests = pending
            .map((b) => convertBookingToRequest(b))
            .filter((r) => r !== null);
          setRequests(convertedRequests);
        }
      } catch (e) {
        console.warn("Could not load from cache:", e);
      }
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

          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders(),
            },
            body: isAccept ? JSON.stringify({}) : undefined,
          });

          if (!res.ok) {
            setError(
              `Failed to ${isAccept ? "confirm" : "reject"} booking (${res.status})`,
            );
          } else {
            setTimeout(() => loadBookingRequests(), 500);
          }
        } catch (err) {
          console.error("Error updating booking status:", err);
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

                      {/* Dropdown detail panel */}
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
                                <div className="detail-cv-card">
                                  <span className="cv-icon">PDF</span>
                                  <span className="cv-filename">
                                    {req.detail.cvFileName}
                                  </span>
                                  <span className="cv-filesize">
                                    {req.detail.cvFileSize}
                                  </span>
                                </div>
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
