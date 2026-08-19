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
    case "ACCEPTED":
    case "CONFIRMED":
    case "AWAIT_REVIEW":
      return "in-progress";
    case "COMPLETED":
      return "done";
    case "REJECTED":
      return "no-show";
    default:
      return "in-progress";
  }
};

// Convert backend booking object to frontend structure
const convertBookingToDashboardRow = (booking) => {
  if (!booking) return null;

  const startTimeStr = booking.startTime || booking.start_time;
  const startTime = new Date(startTimeStr);

  const dateStr = !isNaN(startTime)
    ? startTime.toLocaleDateString("en-GB")
    : "";
  const timeStr = !isNaN(startTime)
    ? startTime.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const bookerDTO = booking.bookerResponseDTO || booking.booker;
  const intervieweeName =
    bookerDTO?.bookerName ||
    bookerDTO?.booker_name ||
    bookerDTO?.fullName ||
    bookerDTO?.full_name ||
    "Unknown Candidate";

  return {
    id: `booking-${booking.bookingId || booking.booking_id}`,
    bookingId: booking.bookingId || booking.booking_id,
    date: dateStr,
    time: timeStr,
    interviewee: intervieweeName,
    about: booking.positionName || "Mock Interview",
    rawStatus:
      booking.bookingStatus || booking.booking_status || booking.status,
    status: mapBookingStatus(
      booking.bookingStatus || booking.booking_status || booking.status,
    ),
    feedback: "",
    money: `$${booking.totalAmount || 5}`,
    meetingUrl: booking.meetingUrl || booking.meeting_url,
    startUrl: booking.startUrl || booking.start_url, // Map start_url từ response DTO
    rawBooking: booking,
  };
};

const STATUS_LABEL = {
  "in-progress": "In Progress",
  done: "Done",
  "no-show": "No-show",
};

const toTimestamp = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return 0;
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
  const [joiningId, setJoiningId] = useState(null); // Trạng thái loading khi click Go to meeting

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/booking/all-bookings`, {
        headers: authHeaders(),
      });

      if (!res.ok)
        throw new Error(`Failed to load dashboard data (${res.status})`);
      const bookings = await res.json();

      const dashboardBookings = (Array.isArray(bookings) ? bookings : [])
        .filter((b) => {
          const st = b.bookingStatus || b.booking_status || b.status;
          return st !== "PENDING";
        })
        .map((b) => convertBookingToDashboardRow(b))
        .filter((r) => r !== null);

      setRequests(dashboardBookings);
      localStorage.setItem("interviewerBookings", JSON.stringify(bookings));
    } catch (err) {
      console.error("Error loading dashboard bookings:", err);
      setError(err.message || "Could not load interview sessions.");

      try {
        const cached = localStorage.getItem("interviewerBookings");
        if (cached) {
          const bookings = JSON.parse(cached);
          const dashboardBookings = bookings
            .filter((b) => {
              const st = b.bookingStatus || b.booking_status || b.status;
              return st !== "PENDING";
            })
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

  // Hàm xử lý lấy start_url tươi từ Controller và mở meeting
  const handleGoToMeeting = async (bookingId, defaultStartUrl) => {
    setJoiningId(bookingId);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/booking/${bookingId}/start-url`,
        {
          headers: authHeaders(),
        },
      );

      if (res.ok) {
        const freshStartUrl = await res.text();
        if (freshStartUrl) {
          window.open(freshStartUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }

      // Fallback nếu có sẵn startUrl trong record
      if (defaultStartUrl) {
        window.open(defaultStartUrl, "_blank", "noopener,noreferrer");
      } else {
        alert(
          "Không thể khởi tạo link Zoom. Vui lòng kiểm tra lại trạng thái!",
        );
      }
    } catch (err) {
      console.error("Lỗi khi lấy start-url:", err);
      if (defaultStartUrl) {
        window.open(defaultStartUrl, "_blank", "noopener,noreferrer");
      } else {
        alert("Có lỗi xảy ra khi kết nối máy chủ.");
      }
    } finally {
      setJoiningId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next) {
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

    if (target && target.bookingId) {
      try {
        const rawId = String(target.bookingId).replace("booking-", "");
        const cleanBookingId = Number(rawId);

        if (isNaN(cleanBookingId)) {
          throw new Error("Mã Booking không hợp lệ.");
        }

        const payload = {
          bookingId: cleanBookingId,
          technicalScore: 8,
          communicationScore: 8,
          preparationLevel: 8,
          overallComment: feedbackText,
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
          const errText = await res.text();
          throw new Error(errText || `Failed with status ${res.status}`);
        }

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

        setToast({
          name: target?.interviewee,
          status: finalStatus,
        });
        setTimeout(() => setToast(null), 2200);
      } catch (err) {
        console.error("Failed to sync completed status to backend:", err);
        alert("Cập nhật thất bại: " + err.message);
      }
    }
  };

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const aGroup = a.status === "in-progress" ? 0 : 1;
      const bGroup = b.status === "in-progress" ? 0 : 1;
      if (aGroup !== bGroup) return aGroup - bGroup;

      const aTime = toTimestamp(a.date, a.time);
      const bTime = toTimestamp(b.date, b.time);
      return bTime - aTime;
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
              <span>MEETING</span> {/* Thêm Cột Meeting */}
              <span className="cell-action-header">ACTION</span>
            </div>

            <AnimatePresence initial={false}>
              {sortedRequests.map((req) => {
                const isOpen = expandedId === req.id;
                const isFinalized = req.status !== "in-progress";
                const isReadyToComplete = req.rawStatus === "AWAIT_REVIEW";

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

                      {/* Cột hiển thị Button Go to Meeting */}
                      <span className="cell-meeting">
                        {req.status === "in-progress" ? (
                          <button
                            type="button"
                            className="go-meeting-btn"
                            disabled={joiningId === req.bookingId}
                            onClick={() =>
                              handleGoToMeeting(req.bookingId, req.startUrl)
                            }
                          >
                            {joiningId === req.bookingId
                              ? "Starting..."
                              : "Go to meeting"}
                          </button>
                        ) : (
                          <span className="cell-meeting-disabled">-</span>
                        )}
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
                                disabled={!isReadyToComplete}
                                className={`decision-btn done-btn ${
                                  !isReadyToComplete
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                onClick={() => finalizeStatus(req.id, "done")}
                              >
                                Done
                              </button>
                            </div>
                            {!isReadyToComplete && (
                              <p className="text-xs text-yellow-500 mt-1">
                                Cần kết thúc cuộc họp Zoom để chuyển sang trạng
                                thái AWAIT_REVIEW trước khi đánh giá.
                              </p>
                            )}
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
