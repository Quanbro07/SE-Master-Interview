"use client";
import { useMemo, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./BookingHistoryPage.css";

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
    "Content-Type": "application/json",
  };
};

const mapBookingStatus = (status) => {
  switch (status) {
    case "ACCEPTED":
    case "CONFIRMED":
    case "AWAIT_REVIEW":
      return "in-progress";
    case "COMPLETED":
      return "done";
    case "REJECTED":
    case "CANCELLED":
      return "cancelled";
    default:
      return "in-progress";
  }
};

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

  const interviewerDTO = booking.interviewerResponseDTO || booking.interviewer;
  const interviewerName =
    interviewerDTO?.fullName ||
    interviewerDTO?.full_name ||
    interviewerDTO?.interviewerName ||
    interviewerDTO?.interviewer_name ||
    "Interviewer";

  const rawStatus =
    booking.bookingStatus || booking.booking_status || booking.status;

  const cleanId = booking.bookingId ?? booking.booking_id;

  return {
    id: `booking-${cleanId}`,
    bookingId: Number(cleanId),
    date: dateStr,
    time: timeStr,
    interviewer: interviewerName,
    about: booking.positionName || "Mock Interview",
    rawStatus: rawStatus,
    status: mapBookingStatus(rawStatus),
    joinUrl:
      booking.joinUrl ||
      booking.join_url ||
      booking.meetingUrl ||
      booking.meeting_url,
    feedback: booking.reviewResponseDTO?.overallComment || "",
    isReviewed: Boolean(booking.reviewResponseDTO || booking.isReviewed),
    rawBooking: booking,
  };
};

const STATUS_LABEL = {
  "in-progress": "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

const toTimestamp = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return 0;
  const [day, month, year] = dateStr.split("/").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
};

const isMeetingTimeValid = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return false;
  const meetingTime = toTimestamp(dateStr, timeStr);
  const now = Date.now();
  const FIFTEEN_MINUTES = 15 * 60 * 1000;

  return (
    now >= meetingTime - FIFTEEN_MINUTES &&
    now <= meetingTime + 2 * 60 * 60 * 1000
  );
};

const BookingHistoryPage = () => {
  const [requests, setRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittedReviews, setSubmittedReviews] = useState([]);

  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [ratingDrafts, setRatingDrafts] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/booking/all-bookings`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Failed to load booking data (${res.status})`);
      }

      const bookings = await res.json();
      const dashboardBookings = (Array.isArray(bookings) ? bookings : [])
        .map((b) => convertBookingToDashboardRow(b))
        .filter((r) => r !== null);

      setRequests(dashboardBookings);
    } catch (err) {
      console.error("Error loading candidate bookings:", err);
      setError(err.message || "Could not load booking history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleJoinMeeting = (joinUrl) => {
    if (joinUrl) {
      window.open(joinUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("Chưa tìm thấy link Zoom cho buổi phỏng vấn này!");
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const updateFeedbackDraft = (id, value) => {
    setFeedbackDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const updateRatingDraft = (id, value) => {
    setRatingDrafts((prev) => ({ ...prev, [id]: Number(value) }));
  };

  const handleSubmitReview = async (req) => {
    const rawBookingId = req.bookingId;
    const comment = feedbackDrafts[req.id] || "";
    const rating = ratingDrafts[req.id] || 5;

    if (!comment.trim()) {
      alert("Vui lòng nhập nội dung đánh giá trước khi gửi.");
      return;
    }

    setSubmittingId(req.id);
    try {
      const payload = {
        booking_id: Number(rawBookingId),
        rate: Number(rating),
        comment: comment.trim(),
      };

      const res = await fetch(`${API_BASE}/api/v1/booking/review-interviewer`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Request failed status ${res.status}`);
      }

      // Đánh dấu đã submit ngay ở client-side
      setSubmittedReviews((prev) => [...prev, Number(rawBookingId)]);

      alert("Đã gửi đánh giá thành công!");
      loadBookings();
    } catch (err) {
      console.error("Submit review error:", err);
      alert("Gửi đánh giá thất bại: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const sortedRequests = useMemo(() => {
    const getStatusPriority = (item) => {
      if (item.rawStatus === "AWAIT_REVIEW") return 1;
      if (item.status === "in-progress") return 2;
      return 3;
    };

    return [...requests].sort((a, b) => {
      const priorityA = getStatusPriority(a);
      const priorityB = getStatusPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const aTime = toTimestamp(a.date, a.time);
      const bTime = toTimestamp(b.date, b.time);
      return bTime - aTime;
    });
  }, [requests]);

  return (
    <div className="booking-history-root">
      <NavigationBar />
      <main className="booking-history-main">
        <section className="booking-history-inner">
          <h1 className="booking-history-title">-----BOOKING HISTORY-----</h1>

          <div className="booking-history-table">
            <div className="booking-history-row booking-history-header">
              <span>DATE</span>
              <span>TIME</span>
              <span>INTERVIEWER</span>
              <span>ABOUT</span>
              <span>STATUS</span>
              <span>MEETING</span>
              <span className="cell-action-header">DETAILS</span>
            </div>

            {loading ? (
              <div className="booking-history-empty">Loading bookings...</div>
            ) : error ? (
              <div className="booking-history-empty text-red-500">{error}</div>
            ) : (
              <AnimatePresence initial={false}>
                {sortedRequests.map((req) => {
                  const isOpen = expandedId === req.id;
                  const isAwaitingReview = req.rawStatus === "AWAIT_REVIEW";
                  const isReadyToJoin =
                    !isAwaitingReview && isMeetingTimeValid(req.date, req.time);

                  // 🟢 Kiểm tra xem cuộc phỏng vấn đã được review chưa
                  const isAlreadyReviewed =
                    req.isReviewed ||
                    req.rawStatus === "COMPLETED" ||
                    submittedReviews.includes(Number(req.bookingId));

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
                      className="booking-history-row-wrap"
                    >
                      <div className="booking-history-row booking-history-data-row">
                        <span className="cell-date">{req.date}</span>
                        <span className="cell-time">{req.time}</span>
                        <span className="cell-interviewer">
                          {req.interviewer}
                        </span>
                        <span className="cell-about">{req.about}</span>
                        <span className={`cell-status status-${req.status}`}>
                          {isAwaitingReview
                            ? "Await Review"
                            : STATUS_LABEL[req.status]}
                        </span>

                        <span className="cell-meeting">
                          {req.status === "in-progress" && !isAwaitingReview ? (
                            <button
                              type="button"
                              className={`join-meeting-btn ${
                                !isReadyToJoin ? "btn-disabled" : ""
                              }`}
                              disabled={!isReadyToJoin || !req.joinUrl}
                              title={
                                !isReadyToJoin
                                  ? "Link phỏng vấn chỉ mở trước giờ họp 15 phút"
                                  : ""
                              }
                              onClick={() => handleJoinMeeting(req.joinUrl)}
                            >
                              Join meeting
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="join-meeting-btn btn-disabled"
                              disabled={true}
                              title="Buổi phỏng vấn đã kết thúc"
                            >
                              Ended
                            </button>
                          )}
                        </span>

                        <span className="cell-action">
                          <button
                            type="button"
                            className={`details-btn ${isOpen ? "is-open" : ""}`}
                            onClick={() => toggleExpand(req.id)}
                          >
                            {isOpen ? "Close" : "View"}
                          </button>
                        </span>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="details-panel"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: "easeInOut" }}
                            className="details-panel-wrap"
                          >
                            <div className="details-panel">
                              <div className="details-field">
                                <span className="details-label">
                                  Interviewer
                                </span>
                                <div className="details-value">
                                  {req.interviewer}
                                </div>
                              </div>

                              <div className="details-field">
                                <span className="details-label">
                                  Position / Category
                                </span>
                                <div className="details-value">{req.about}</div>
                              </div>

                              <div className="details-field">
                                <span className="details-label">
                                  Review Interviewer
                                </span>

                                {req.feedback ? (
                                  <div className="feedback-box">
                                    {req.feedback}
                                  </div>
                                ) : (
                                  <div className="review-input-container">
                                    <div className="rating-select-row">
                                      <span className="rating-label">
                                        Rating:
                                      </span>
                                      <select
                                        className="rating-select"
                                        disabled={isAlreadyReviewed}
                                        value={ratingDrafts[req.id] || 5}
                                        onChange={(e) =>
                                          updateRatingDraft(
                                            req.id,
                                            e.target.value,
                                          )
                                        }
                                      >
                                        <option value={5}>
                                          5 ★ - Excellent
                                        </option>
                                        <option value={4}>
                                          4 ★ - Very Good
                                        </option>
                                        <option value={3}>3 ★ - Good</option>
                                        <option value={2}>2 ★ - Fair</option>
                                        <option value={1}>1 ★ - Poor</option>
                                      </select>
                                    </div>

                                    <textarea
                                      className="feedback-textarea"
                                      rows={3}
                                      disabled={isAlreadyReviewed}
                                      readOnly={isAlreadyReviewed}
                                      placeholder={
                                        isAlreadyReviewed
                                          ? "Đã gửi đánh giá"
                                          : "Write your review for the interviewer..."
                                      }
                                      value={feedbackDrafts[req.id] || ""}
                                      onChange={(e) =>
                                        updateFeedbackDraft(
                                          req.id,
                                          e.target.value,
                                        )
                                      }
                                    />

                                    <div className="submit-btn-row">
                                      <button
                                        type="button"
                                        className="submit-review-btn"
                                        disabled={
                                          isAlreadyReviewed ||
                                          submittingId === req.id
                                        }
                                        style={
                                          isAlreadyReviewed
                                            ? {
                                                backgroundColor: "#6b7280",
                                                cursor: "not-allowed",
                                                opacity: 0.6,
                                              }
                                            : {}
                                        }
                                        onClick={() => handleSubmitReview(req)}
                                      >
                                        {isAlreadyReviewed
                                          ? "SUBMITTED"
                                          : submittingId === req.id
                                            ? "SUBMITTING..."
                                            : "SUBMIT REVIEW"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {!loading && sortedRequests.length === 0 && (
              <motion.div
                className="booking-history-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                No interview sessions found.
              </motion.div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default BookingHistoryPage;
