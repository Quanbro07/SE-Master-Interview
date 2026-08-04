"use client";
import { useMemo, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RNavigationBar from "../RNavigationBar/RNavigationBar";
import "./RDashboard.css";

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

// Map backend booking status to frontend status
const mapBookingStatus = (status) => {
  switch (status) {
    case "CONFIRMED":
      return "in-progress";
    case "COMPLETED":
      return "done";
    case "REJECTED":
      return "no-show"; // Or hide rejected rows
    default:
      return "in-progress";
  }
};

// Convert backend booking object to frontend structure
const convertBookingToDashboardRow = (booking) => {
  if (!booking) return null;

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
    interviewee: booking.booker?.full_name || "Unknown Candidate",
    about: booking.booker?.position || "Mock Interview",
    status: mapBookingStatus(booking.booking_status),
    feedback: "", // Will be filled from state/drafts
    money: "$5", // Standard fee or from backend if available
    meetingUrl: booking.meeting_url,
    meetingStartUrl: booking.meeting_url, // Or fetch start url
    rawBooking: booking,
  };
};

const STATUS_LABEL = {
  "in-progress": "In Progress",
  done: "Done",
  "no-show": "No-show",
};

// Turns "DD/MM/YYYY" + "HH:mm" into a real, sortable timestamp.
const toTimestamp = (dateStr, timeStr) => {
  const [day, month, year] = dateStr.split("/").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
};

const RDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch confirmed/ongoing/completed bookings from backend
  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all bookings for interviewer (CONFIRMED & COMPLETED)
      const res = await fetch(`${API_BASE}/api/v1/booking/all-bookings`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error(`Failed to load dashboard data (${res.status})`);
      const bookings = await res.json();

      // Filter out PENDING bookings (those belong in Booking Requests view)
      const dashboardBookings = (Array.isArray(bookings) ? bookings : [])
        .filter((b) => b.booking_status !== "PENDING")
        .map((b) => convertBookingToDashboardRow(b))
        .filter((r) => r !== null);

      setRequests(dashboardBookings);

      // Cache bookings locally
      localStorage.setItem("interviewerBookings", JSON.stringify(bookings));
    } catch (err) {
      console.error("Error loading dashboard bookings:", err);
      setError(err.message || "Could not load interview sessions.");

      // Fallback to cache if available
      try {
        const cached = localStorage.getItem("interviewerBookings");
        if (cached) {
          const bookings = JSON.parse(cached);
          const dashboardBookings = bookings
            .filter((b) => b.booking_status !== "PENDING")
            .map((b) => convertBookingToDashboardRow(b))
            .filter((r) => r !== null);
          setRequests(dashboardBookings);
        }
      } catch (e) {
        console.warn("Could not load from cache:", e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next) {
        // seed the draft with whatever feedback already exists for this row
        setFeedbackDrafts((drafts) => ({
          ...drafts,
          [id]: drafts[id] ?? requests.find((r) => r.id === id)?.feedback ?? "",
        }));
      }
      return next;
    });
  };

  const updateFeedbackDraft = (id, value) => {
    setFeedbackDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const finalizeStatus = async (id, finalStatus) => {
    const target = requests.find((r) => r.id === id);
    const feedbackText = feedbackDrafts[id] ?? target?.feedback ?? "";

    // Update local state immediately for responsive UI
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: finalStatus,
              feedback: feedbackText,
            }
          : r,
      ),
    );
    setExpandedId(null);

    // Call backend API to mark interview as completed
    if (target && target.bookingId) {
      try {
        const payload = {
          bookingId: target.bookingId,
          notes: feedbackText,
          status: finalStatus === "done" ? "COMPLETED" : "NO_SHOW",
        };

        const res = await fetch(`${API_BASE}/api/v1/booking/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.warn(`Backend completion endpoint returned ${res.status}`);
        }
      } catch (err) {
        console.error("Failed to sync completed status to backend:", err);
      }
    }

    setToast({
      name: target?.interviewee,
      status: finalStatus,
    });
    setTimeout(() => setToast(null), 2200);
  };

  // Sort rule:
  // 1) In-progress rows always float to the top as a group.
  // 2) Within a group (in-progress, or the finished group where done/no-show
  //    aren't separated), newer dates/times rank higher.
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const aGroup = a.status === "in-progress" ? 0 : 1;
      const bGroup = b.status === "in-progress" ? 0 : 1;
      if (aGroup !== bGroup) return aGroup - bGroup;

      const aTime = toTimestamp(a.date, a.time);
      const bTime = toTimestamp(b.date, b.time);
      return bTime - aTime; // newer first
    });
  }, [requests]);

  return (
    <div className="r-dashboard-root">
      <RNavigationBar />
      <main className="r-dashboard-main">
        <section className="r-dashboard-inner">
          <h1 className="r-dashboard-title">-----DASHBOARD-----</h1>

          <div className="r-dashboard-table">
            <div className="r-dashboard-row r-dashboard-header">
              <span>DATE</span>
              <span>TIME</span>
              <span>INTERVIEWEE</span>
              <span>ABOUT</span>
              <span>STATUS</span>
              <span className="cell-action-header">ACTION</span>
            </div>

            <AnimatePresence initial={false}>
              {sortedRequests.map((req) => {
                const isOpen = expandedId === req.id;
                const isFinalized = req.status !== "in-progress";

                return (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      layout: { duration: 0.4, ease: "easeInOut" },
                    }}
                    className="r-dashboard-row-wrap"
                  >
                    <div className="r-dashboard-row r-dashboard-data-row">
                      <span className="cell-date">{req.date}</span>
                      <span className="cell-time">{req.time}</span>
                      <span className="cell-interviewee">
                        {req.interviewee}
                      </span>
                      <span className="cell-about">{req.about}</span>
                      <span className={`cell-status status-${req.status}`}>
                        {STATUS_LABEL[req.status]}
                      </span>
                      <span className="cell-action">
                        <button
                          type="button"
                          className={`update-btn ${isOpen ? "is-open" : ""} ${isFinalized ? "is-disabled" : ""}`}
                          onClick={() => !isFinalized && toggleExpand(req.id)}
                          disabled={isFinalized}
                        >
                          {isFinalized ? STATUS_LABEL[req.status] : "Update"}
                        </button>
                      </span>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && !isFinalized && (
                        <motion.div
                          key="update-panel"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: "easeInOut" }}
                          className="update-panel-wrap"
                        >
                          <div className="update-panel">
                            <div className="update-field">
                              <span className="update-label">Candidate</span>
                              <div className="update-pill">
                                {req.interviewee}
                              </div>
                            </div>

                            <div className="update-field">
                              <span className="update-label">Feedback</span>
                              <textarea
                                className="update-feedback-box"
                                rows={4}
                                placeholder="Write feedback about the candidate's performance..."
                                value={feedbackDrafts[req.id] ?? ""}
                                onChange={(e) =>
                                  updateFeedbackDraft(req.id, e.target.value)
                                }
                              />
                            </div>

                            <div className="update-money-row">
                              <span className="update-label">Money</span>
                              <p className="update-money-note">
                                {req.money} securely held via Stripe
                                Authorization
                              </p>
                            </div>

                            <div className="update-decision-row">
                              <button
                                type="button"
                                className="decision-btn no-show-btn"
                                onClick={() =>
                                  finalizeStatus(req.id, "no-show")
                                }
                              >
                                No-show
                              </button>
                              <button
                                type="button"
                                className="decision-btn done-btn"
                                onClick={() => finalizeStatus(req.id, "done")}
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {sortedRequests.length === 0 && (
              <motion.div
                className="r-dashboard-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                No meetings to show right now.
              </motion.div>
            )}
          </div>
        </section>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={`r-dashboard-toast status-${toast.status}`}
          >
            Marked {STATUS_LABEL[toast.status]} for {toast.name}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RDashboard;
