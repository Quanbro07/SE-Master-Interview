"use client";
import { useMemo, useState, useEffect, useCallback } from "react";
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
  pending: "Pending",
  accepted: "Accepted",
  paid: "Paid",
  "in-progress": "In Progress",
  "await-review": "Await Review",
  done: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
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
const isWithin5MinutesBeforeMeeting = (dateStr, timeStr) => {
  const meetingTimestamp = toTimestamp(dateStr, timeStr);
  if (!meetingTimestamp) return false;

  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;
  const SIXTY_MINUTES = 60 * 60 * 1000;

  return (
    now >= meetingTimestamp - FIVE_MINUTES &&
    now <= meetingTimestamp + SIXTY_MINUTES
  );
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

      const dashboardBookings = (Array.isArray(bookings) ? bookings : [])
        .map((b) => convertBookingToDashboardRow(b))
        .filter((r) => r !== null);

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
      alert("Payment initialization error: " + err.message);
    } finally {
      setCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = () => {
    alert("Payment successful!");
    setPaymentTarget(null);
    loadBookings();
  };

  const handleJoinMeeting = (joinUrl) => {
    if (joinUrl) {
      window.open(joinUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("Meeting link is not available yet!");
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
      alert("Please enter review content before submitting.");
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
      alert("Review submitted successfully!");
      loadBookings();
    } catch (err) {
      console.error("Submit review error:", err);
      alert("Failed to submit review: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

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
                {requests.map((req) => {
                  const isOpen = expandedId === req.id;

                  const isPending = req.rawStatus === "PENDING";
                  const isAccepted = req.rawStatus === "ACCEPTED";
                  const isPaid = req.rawStatus === "PAID";
                  const isInProgress = req.rawStatus === "IN_PROGRESS";
                  const isAwaitReview = req.rawStatus === "AWAIT_REVIEW";
                  const isCompleted = req.rawStatus === "COMPLETED";

                  const is5MinBefore = isWithin5MinutesBeforeMeeting(
                    req.date,
                    req.time,
                  );
                  const hasStartUrl = Boolean(req.startUrl);

                  // 🟢 Nút Join Meeting Enable khi: Có start_url HOẶC Tới trước 5 phút
                  const canJoinMeeting =
                    (isPaid || isInProgress || isAwaitReview) &&
                    Boolean(req.joinUrl) &&
                    (hasStartUrl || is5MinBefore);

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
                            className={`join-meeting-btn ${
                              !canJoinMeeting ? "btn-disabled" : ""
                            }`}
                            disabled={!canJoinMeeting}
                            onClick={() => handleJoinMeeting(req.joinUrl)}
                          >
                            {canJoinMeeting
                              ? "Join Meeting"
                              : isPending || isAccepted
                                ? "Not Ready"
                                : !hasStartUrl &&
                                    !is5MinBefore &&
                                    (isPaid || isInProgress)
                                  ? "Not In Time"
                                  : "Ended"}
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
                            className="details-panel-wrap"
                          >
                            <div
                              className="details-panel"
                              style={{ padding: "16px" }}
                            >
                              <div className="details-field">
                                <span className="details-label">
                                  Interviewer:{" "}
                                </span>
                                <strong>{req.interviewer}</strong>
                              </div>
                              <div
                                className="details-field"
                                style={{ marginTop: "8px" }}
                              >
                                <span className="details-label">Fee: </span>
                                <span>{req.price}</span>
                              </div>

                              {isAccepted && (
                                <div style={{ marginTop: "16px" }}>
                                  <button
                                    type="button"
                                    style={{
                                      backgroundColor: "#4C1D95",
                                      color: "#FFFFFF",
                                      padding: "10px 20px",
                                      borderRadius: "6px",
                                      fontWeight: "600",
                                      border: "none",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => handleOpenPaymentModal(req)}
                                    disabled={creatingIntent}
                                  >
                                    {creatingIntent
                                      ? "INITIALIZING..."
                                      : "PAY NOW"}
                                  </button>
                                </div>
                              )}

                              {/* 🟢 Khối review xuất hiện ở Await Review HOẶC Completed */}
                              {(isAwaitReview || isCompleted) && (
                                <div
                                  className="details-field"
                                  style={{ marginTop: "16px" }}
                                >
                                  <span className="details-label">
                                    Review Interviewer
                                  </span>
                                  {isAlreadyReviewed ? (
                                    <div
                                      className="existing-review-box p-3 bg-gray-100 rounded text-sm"
                                      style={{ marginTop: "8px" }}
                                    >
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
                                    <div
                                      className="review-input-container"
                                      style={{ marginTop: "8px" }}
                                    >
                                      <div className="rating-select-row">
                                        <span className="rating-label">
                                          Rating:{" "}
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
                                        rows={3}
                                        style={{
                                          width: "100%",
                                          marginTop: "8px",
                                          padding: "8px",
                                        }}
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

                                      <div
                                        className="submit-btn-row"
                                        style={{ marginTop: "8px" }}
                                      >
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
    </div>
  );
};

export default BookingHistoryPage;
