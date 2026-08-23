"use client";
import { useMemo, useState, useEffect, useCallback } from "react";
import Toast from "../Toast/Toast";
import { AnimatePresence, motion } from "framer-motion";
import NavigationBar from "../NavigationBar/NavigationBar";
import StripePaymentModal from "../BookingPage/StripePaymentModal";
import UserHeader from "../UserHeader/UserHeader";
import ChatPanel from "../ChatPanel/ChatPanel";
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
  const upperStatus = (status || "").toUpperCase();
  switch (upperStatus) {
    case "PENDING":
      return "pending";
    case "ACCEPTED":
      return "accepted";
    case "PAID":
      return "paid";
    case "IN_PROGRESS":
      return "in-progress";
    case "AWAIT_REVIEW":
      return "await-review";
    case "COMPLETED":
      return "done";
    case "REJECTED":
      return "rejected";
    case "CANCELLED":
      return "cancelled";
    default:
      return "pending";
  }
};

const STATUS_LABEL = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  paid: "PAID",
  "in-progress": "IN PROGRESS",
  "await-review": "AWAIT REVIEW",
  done: "COMPLETED",
  rejected: "REJECTED",
  cancelled: "CANCELLED",
};

const STATUS_PRIORITY_MAP = {
  IN_PROGRESS: 1,
  "IN-PROGRESS": 1,
  AWAIT_REVIEW: 2,
  "AWAIT-REVIEW": 2,
  PAID: 3,
  PENDING: 4,
  ACCEPTED: 4,
  COMPLETED: 5,
  DONE: 5,
  REJECTED: 6,
  CANCELLED: 7,
};

const toTimestamp = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return 0;

  let day, month, year;
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/").map(Number);
    if (parts[2] > 1000) {
      [day, month, year] = parts;
    } else {
      [month, day, year] = parts;
    }
  } else if (dateStr.includes("-")) {
    const parts = dateStr.split("-").map(Number);
    if (parts[0] > 1000) {
      [year, month, day] = parts;
    } else {
      [day, month, year] = parts;
    }
  } else {
    return 0;
  }

  const [hour, minute] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
};

// Kiếm tra tới trước meeting 5 phút
const isMeetingTimeValid = (dateStr, timeStr) => {
  const meetingTimestamp = toTimestamp(dateStr, timeStr);
  if (!meetingTimestamp) return false;

  const now = Date.now();
  const before = 5 * 60 * 1000;
  const after = 60 * 60 * 1000; // Mở rộng khoảng thời gian diễn ra cuộc họp

  return now >= meetingTimestamp - before && now <= meetingTimestamp + after;
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
    booking.interviewerName ||
    "Interviewer";

  const rawStatus = (
    booking.bookingStatus ||
    booking.booking_status ||
    booking.status ||
    ""
  ).toUpperCase();

  const cleanId = booking.bookingId ?? booking.booking_id;

  const reviewData = booking.booking_review || booking.bookingReview;
  const existingComment = reviewData?.comment || "";
  const existingRating = reviewData?.rate ?? reviewData?.rating ?? 5;
  const isReviewed = Boolean(
    reviewData &&
    (reviewData.review_id || reviewData.comment || reviewData.rate),
  );
  const rawAmount =
    booking.totalAmount ??
    booking.total_amount ??
    booking.price ??
    booking.amount ??
    interviewerDTO?.price;

  const priceDisplay =
    rawAmount !== undefined && rawAmount !== null && rawAmount !== ""
      ? `$${Number(rawAmount).toFixed(2)} / session`
      : "$10 / session";

  return {
    id: `booking-${cleanId}`,
    bookingId: Number(cleanId),
    date: dateStr,
    time: timeStr,
    interviewer: interviewerName,
    price: priceDisplay,
    rawAmount: rawAmount,
    about: booking.positionName || booking.position || "Mock Interview",
    rawStatus: rawStatus,
    status: mapBookingStatus(rawStatus),
    joinUrl:
      booking.joinUrl ||
      booking.join_url ||
      booking.meetingUrl ||
      booking.meeting_url,
    startUrl: booking.startUrl || booking.start_url,
    feedback: existingComment,
    rating: existingRating,
    isReviewed: isReviewed,
    rawBooking: booking,
  };
};

const BookingHistoryPage = () => {
  const [toast, setToast] = useState(null);
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittedReviews, setSubmittedReviews] = useState([]);
  const [submittedReviewsMap, setSubmittedReviewsMap] = useState({});

  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [ratingDrafts, setRatingDrafts] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const [paymentTarget, setPaymentTarget] = useState(null);
  const [creatingIntent, setCreatingIntent] = useState(false);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) setCurrentUser(JSON.parse(userStr));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleToggleChat = () => {
    setChatCollapsed((prev) => !prev);
  };

  const handleBookFromChat = (data) => {
    console.log("Book from chat action:", data);
  };

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/booking/all-bookings`, {
        headers: authHeaders(),
      });

      if (!res.ok)
        throw new Error(`Failed to load booking data (${res.status})`);

      const bookings = await res.json();

      if (Array.isArray(bookings)) {
        bookings.forEach((b, index) => {
          console.log(
            `Booking #${index + 1} (ID: ${b.bookingId || b.booking_id}):`,
            {
              bookingStatus: b.bookingStatus || b.booking_status || b.status,
              joinUrl: b.joinUrl || b.join_url,
              meetingUrl: b.meetingUrl || b.meeting_url,
              rawObject: b,
            },
          );
        });
      }

      const dashboardBookings = (Array.isArray(bookings) ? bookings : [])
        .map((b) => convertBookingToDashboardRow(b))
        .filter((r) => r !== null);
      console.log("=== MAPPED DASHBOARD BOOKINGS ===", dashboardBookings);

      setRequests(dashboardBookings);
    } catch (err) {
      console.error("❌ Error loading candidate bookings:", err);
      setError(err.message || "Could not load booking history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleOpenPaymentModal = async (req) => {
    setCreatingIntent(true);
    try {
      const intentRes = await fetch(
        `${API_BASE}/api/v1/stripe/${req.bookingId}/create-intent`,
        {
          method: "POST",
          headers: authHeaders(),
        },
      );

      if (!intentRes.ok) {
        throw new Error(`Stripe initialization failed (${intentRes.status})`);
      }

      const intentData = await intentRes.json();
      const secret = intentData.client_secret || intentData.clientSecret;
      if (!secret)
        throw new Error("Did not receive clientSecret from Backend.");

      setPaymentTarget({ req, clientSecret: secret });
    } catch (err) {
      showToast("Payment initialization error: " + err.message, "error");
    } finally {
      setCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = () => {
    showToast("Payment successful!", "success");
    setPaymentTarget(null);
    loadBookings();
  };

  const handleJoinMeeting = (joinUrl) => {
    if (joinUrl) {
      window.open(joinUrl, "_blank", "noopener,noreferrer");
    } else {
      showToast("Meeting link is not available yet!", "error");
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
      showToast("Please enter review content before submitting.", "error");
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

      setSubmittedReviewsMap((prev) => ({
        ...prev,
        [Number(rawBookingId)]: {
          rating: Number(rating),
          comment: comment.trim(),
        },
      }));

      setSubmittedReviews((prev) => [...prev, Number(rawBookingId)]);
      showToast("Review submitted successfully!", "success");
      loadBookings();
    } catch (err) {
      console.error("Submit review error:", err);
      showToast("Failed to submit review: " + err.message, "error");
    } finally {
      setSubmittingId(null);
    }
  };

  const sortedRequests = useMemo(() => {
    const getStatusPriority = (item) => {
      const st = (item.rawStatus || "").toUpperCase();
      return STATUS_PRIORITY_MAP[st] || 99;
    };

    const getDayTimestamp = (dateStr) => {
      if (!dateStr) return 0;
      let day, month, year;
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/").map(Number);
        if (parts[2] > 1000) [day, month, year] = parts;
        else [month, day, year] = parts;
      } else if (dateStr.includes("-")) {
        const parts = dateStr.split("-").map(Number);
        if (parts[0] > 1000) [year, month, day] = parts;
        else [day, month, year] = parts;
      } else return 0;
      return new Date(year, month - 1, day).getTime();
    };

    return [...requests].sort((a, b) => {
      // 1. So sánh theo ngày (Giảm dần: Ngày mới nhất đứng trước)
      const dateA = getDayTimestamp(a.date);
      const dateB = getDayTimestamp(b.date);

      if (dateA !== dateB) {
        return dateB - dateA;
      }

      // 2. Nếu cùng ngày: Ưu tiên theo thứ tự IN-PROGRESS, AWAIT-REVIEW, PAID, PENDING, COMPLETED, REJECTED, CANCELLED
      const priorityA = getStatusPriority(a);
      const priorityB = getStatusPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 3. Nếu cùng status nữa thì xếp theo thời gian trong ngày (Giảm dần)
      const aTime = toTimestamp(a.date, a.time);
      const bTime = toTimestamp(b.date, b.time);
      return bTime - aTime;
    });
  }, [requests]);

  return (
    <div className="booking-history-root">
      <NavigationBar />

      <main
        className={`booking-history-main ${!chatCollapsed ? "with-chat" : ""}`}
      >
        <section className="booking-history-inner">
          <h1 className="booking-history-title">BOOKING HISTORY</h1>
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

                  const isPending = req.rawStatus === "PENDING";
                  const isAccepted = req.rawStatus === "ACCEPTED";
                  const isPaid = req.rawStatus === "PAID";
                  const isInProgress =
                    req.rawStatus === "IN_PROGRESS" ||
                    req.rawStatus === "IN-PROGRESS" ||
                    req.status === "in-progress";
                  const isAwaitReview = req.rawStatus === "AWAIT_REVIEW";
                  const isCompleted = req.rawStatus === "COMPLETED";

                  const isTimeValid = isMeetingTimeValid(req.date, req.time);
                  const hasStartUrl = Boolean(req.startUrl);
                  const hasJoinUrl = Boolean(req.joinUrl);

                  // 🟢 Nút Join Meeting Enable khi: Có start_url HOẶC Tới trước 5 phút
                  const canJoinMeeting =
                    hasJoinUrl &&
                    (isInProgress || (isPaid && (isTimeValid || hasStartUrl)));

                  const getMeetingButtonLabel = () => {
                    if (canJoinMeeting) return "Join Meeting";
                    if (!hasJoinUrl && (isInProgress || isPaid))
                      return "No Link";
                    if (isPending || isAccepted) return "Not Ready";
                    if (isPaid && !isTimeValid && !hasStartUrl)
                      return "Not In Time";
                    return "Ended";
                  };
                  const localSubmitted =
                    submittedReviewsMap[Number(req.bookingId)];
                  const isAlreadyReviewed =
                    req.isReviewed || Boolean(localSubmitted);
                  const displayRating = localSubmitted
                    ? localSubmitted.rating
                    : req.rating;
                  const displayComment = localSubmitted
                    ? localSubmitted.comment
                    : req.feedback;

                  return (
                    <motion.div
                      key={req.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
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
                          {STATUS_LABEL[req.status] || req.rawStatus}
                        </span>

                        <span className="cell-meeting">
                          <button
                            type="button"
                            className={`join-meeting-btn ${!canJoinMeeting ? "btn-disabled" : ""}`}
                            disabled={!canJoinMeeting}
                            onClick={() => handleJoinMeeting(req.joinUrl)}
                          >
                            {getMeetingButtonLabel()}
                          </button>
                        </span>

                        <span className="cell-action">
                          {/* 🟢 Nút View LUÔN ENABLE ở mọi status */}
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
                              {/* Hàng 1: Tiêu đề + Giá trị nằm chung 1 hàng trong các Pill Box */}
                              <div className="details-info-row">
                                <div className="details-inline-field">
                                  <span className="details-label">
                                    INTERVIEWER
                                  </span>
                                  <div className="details-pill">
                                    {req.interviewer}
                                  </div>
                                </div>

                                <div className="details-inline-field">
                                  <span className="details-label">FEE</span>
                                  <div className="details-pill">
                                    {req.price}
                                  </div>
                                </div>
                              </div>

                              {/* Nút Pay Now (Nếu có) */}
                              {isAccepted && (
                                <div>
                                  <button
                                    type="button"
                                    className="pay-now-btn"
                                    onClick={() => handleOpenPaymentModal(req)}
                                    disabled={creatingIntent}
                                  >
                                    {creatingIntent
                                      ? "INITIALIZING..."
                                      : "PAY NOW"}
                                  </button>
                                </div>
                              )}

                              {/* Khung Review lớn */}
                              {(isAwaitReview || isCompleted) && (
                                <div className="review-section">
                                  <span className="details-label">
                                    REVIEW INTERVIEWER
                                  </span>
                                  {isAlreadyReviewed ? (
                                    <div className="existing-review-box">
                                      <div className="font-semibold text-yellow-500 mb-1">
                                        Rating: {displayRating} ★
                                      </div>
                                      <div className="text-gray-300">
                                        {displayComment
                                          ? displayComment
                                          : "No comment provided."}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="review-input-container">
                                      <div className="rating-select-row">
                                        <span className="rating-label">
                                          Rating:
                                        </span>
                                        <select
                                          className="rating-select"
                                          value={
                                            ratingDrafts[req.id] ??
                                            req.rating ??
                                            5
                                          }
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
                                        rows={4}
                                        placeholder="Write your review for the interviewer..."
                                        value={
                                          feedbackDrafts[req.id] ??
                                          req.feedback ??
                                          ""
                                        }
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
                                          disabled={submittingId === req.id}
                                          onClick={() =>
                                            handleSubmitReview(req)
                                          }
                                        >
                                          {submittingId === req.id
                                            ? "SUBMITTING..."
                                            : "SUBMIT REVIEW"}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {!loading && requests.length === 0 && (
              <div className="booking-history-empty">
                No interview sessions found.
              </div>
            )}
          </div>
        </section>
      </main>

      <UserHeader
        user={currentUser}
        isChatOpen={!chatCollapsed}
        onToggleChat={handleToggleChat}
      />

      <ChatPanel
        isCollapsed={chatCollapsed}
        onBookFromChat={handleBookFromChat}
      />

      {paymentTarget && (
        <StripePaymentModal
          clientSecret={paymentTarget.clientSecret}
          bookingId={paymentTarget.req.bookingId}
          mentor={{
            name: paymentTarget.req.interviewer,
            price: paymentTarget.req.price,
          }}
          onPaid={handlePaymentSuccess}
          onCancel={() => setPaymentTarget(null)}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default BookingHistoryPage;
