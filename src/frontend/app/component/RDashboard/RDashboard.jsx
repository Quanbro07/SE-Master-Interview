"use client";
import { useMemo, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RNavigationBar from "../RNavigationBar/RNavigationBar";
import "./RDashboard.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const getAccessToken = () => {
  if (typeof window === "undefined") return "";
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token") ||
    "";
  return token;
};

const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };
};

const mapBookingStatus = (status) => {
  const upperStatus = (status || "").toUpperCase();
  switch (upperStatus) {
    case "PAID":
      return "paid";
    case "ACCEPTED":
      return "accepted";
    case "IN_PROGRESS":
      return "in-progress";
    case "AWAIT_REVIEW":
      return "await-review";
    case "COMPLETED":
      return "done";
    case "REJECTED":
    case "CANCELLED":
      return "rejected";
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

  const bookerDTO = booking.bookerResponseDTO || booking.booker;
  const intervieweeName =
    bookerDTO?.bookerName ||
    bookerDTO?.booker_name ||
    bookerDTO?.fullName ||
    bookerDTO?.full_name ||
    "Unknown Candidate";

  const rawStatus = (
    booking.bookingStatus ||
    booking.booking_status ||
    booking.status ||
    ""
  ).toUpperCase();

  const cleanId = booking.bookingId ?? booking.booking_id;

  // ƯU TIÊN startUrl -> joinUrl / meetingUrl
  const preferredMeetingUrl =
    booking.startUrl ||
    booking.start_url ||
    booking.joinUrl ||
    booking.join_url ||
    booking.meetingUrl ||
    booking.meeting_url;

  return {
    id: `booking-${cleanId}`,
    bookingId: Number(cleanId),
    date: dateStr,
    time: timeStr,
    interviewee: intervieweeName,
    about: booking.positionName || "Mock Interview",
    rawStatus: rawStatus,
    status: mapBookingStatus(rawStatus),
    feedback: "",
    money: `$${booking.totalAmount || 10}`,
    startUrl: preferredMeetingUrl,
    rawBooking: booking,
  };
};

const toTimestamp = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return 0;
  const [day, month, year] = dateStr.split("/").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
};

const isMeetingTimeValid = (dateStr, timeStr) => {
  const meetingTimestamp = toTimestamp(dateStr, timeStr);
  if (!meetingTimestamp) return false;

  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  const SIXTY_MINUTES = 60 * 60 * 1000;

  return (
    now >= meetingTimestamp - TEN_MINUTES &&
    now <= meetingTimestamp + SIXTY_MINUTES
  );
};

const RDashboard = () => {
  const [submittedBookings, setSubmittedBookings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joiningId, setJoiningId] = useState(null);

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
          const st = (
            b.bookingStatus ||
            b.booking_status ||
            b.status ||
            ""
          ).toUpperCase();
          return st !== "PENDING";
        })
        .map((b) => convertBookingToDashboardRow(b))
        .filter((r) => r !== null);

      setRequests(dashboardBookings);
    } catch (err) {
      console.error("Error loading dashboard bookings:", err);
      setError(err.message || "Could not load interview sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleGoToMeeting = async (bookingId, fallbackUrl) => {
    const cleanBookingId = Number(bookingId);
    if (!cleanBookingId) {
      console.error("❌ [Start Meeting] Booking ID không hợp lệ:", bookingId);
      alert("Booking ID không hợp lệ!");
      return;
    }

    setJoiningId(cleanBookingId);
    const headers = authHeaders();

    // 🔍 LOG DEBUG: Kiểm tra Token & Request
    console.group(
      `🚀 [Start Meeting] Requesting Zoom URL for Booking #${cleanBookingId}`,
    );
    console.log("📌 Request Headers Sent:", headers);
    console.log("📌 Fallback URL Available:", fallbackUrl);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/booking/${cleanBookingId}/start-url`,
        {
          method: "GET",
          headers: headers,
        },
      );

      console.log(`📡 Response Status: ${res.status} ${res.statusText}`);

      if (res.ok) {
        const freshStartUrl = await res.text();
        console.log("✅ Received Fresh Start URL:", freshStartUrl);

        if (freshStartUrl && freshStartUrl.trim() !== "") {
          console.groupEnd();
          window.open(freshStartUrl, "_blank", "noopener,noreferrer");
          loadBookings();
          return;
        }
      } else {
        // 🚨 Đọc chi tiết lỗi từ Backend trả về
        const errorDetail = await res.text().catch(() => "No response body");
        console.error("❌ Backend Error Details:", {
          status: res.status,
          statusText: res.statusText,
          message: errorDetail,
        });

        if (res.status === 401 || res.status === 403) {
          alert(
            `Lỗi ${res.status}: Bạn không có quyền hoặc phiên đăng nhập hết hạn! Chi tiết: ${errorDetail}`,
          );
        }
      }

      // 🔄 THỬ FALLBACK LINK
      if (fallbackUrl) {
        console.warn("⚠️ Using Fallback URL instead:", fallbackUrl);
        console.groupEnd();
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        loadBookings();
      } else {
        console.error("❌ No Fallback URL available!");
        console.groupEnd();
        alert(
          "Không thể lấy link Zoom meeting. Vui lòng kiểm tra lại Console!",
        );
      }
    } catch (err) {
      console.error("🔥 Exception during fetch:", err);
      console.groupEnd();

      if (fallbackUrl) {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        loadBookings();
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
    if (!target || !target.bookingId) {
      alert("Không tìm thấy Booking ID hợp lệ!");
      return;
    }

    const feedbackText = feedbackDrafts[id] ?? target?.feedback ?? "";

    if (target && target.bookingId) {
      try {
        const cleanBookingId = Number(target.bookingId);
        const safeComment = feedbackText.slice(0, 500);

        const payload = {
          booking_id: cleanBookingId,
          technical_score: 8,
          communication_score: 8,
          preparation_level: "WELL_PREPARED",
          overall_comment: safeComment,
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
          const errJson = await res.json().catch(() => null);
          const errMsg = errJson?.message || `Failed with status ${res.status}`;
          throw new Error(errMsg);
        }

        setSubmittedBookings((prev) => [...prev, cleanBookingId]);
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: finalStatus,
                  rawStatus: "COMPLETED",
                  feedback: feedbackText,
                }
              : r,
          ),
        );
        setExpandedId(null);
        setToast({ name: target?.interviewee, status: finalStatus });
        setTimeout(() => setToast(null), 2200);
      } catch (err) {
        console.error("Failed to sync completed status to backend:", err);
        alert("Cập nhật thất bại: " + err.message);
      }
    }
  };

  const sortedRequests = useMemo(() => {
    const getStatusPriority = (item) => {
      const st = item.rawStatus;
      if (
        st === "PAID" ||
        st === "ACCEPTED" ||
        st === "IN_PROGRESS" ||
        st === "AWAIT_REVIEW"
      )
        return 1;
      if (st === "PENDING") return 2;
      if (st === "COMPLETED") return 3;
      if (st === "REJECTED" || st === "CANCELLED") return 4;
      return 5;
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
              <span>MEETING</span>
              <span className="cell-action-header">ACTION</span>
            </div>

            <AnimatePresence initial={false}>
              {sortedRequests.map((req) => {
                const isOpen = expandedId === req.id;

                const isSubmittedLocally = submittedBookings.includes(
                  req.bookingId,
                );
                const isAwaitingReview = req.rawStatus === "AWAIT_REVIEW";

                const isFinalized =
                  req.rawStatus === "COMPLETED" ||
                  req.rawStatus === "REJECTED" ||
                  req.rawStatus === "CANCELLED" ||
                  isSubmittedLocally;

                const isTimeValid = isMeetingTimeValid(req.date, req.time);

                const canStartMeeting =
                  (req.rawStatus === "PAID" ||
                    req.rawStatus === "IN_PROGRESS") &&
                  !isSubmittedLocally &&
                  isTimeValid;

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
                        {STATUS_LABEL[req.status] || req.rawStatus}
                      </span>

                      <span className="cell-meeting">
                        {canStartMeeting ? (
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
                              : "Start Meeting"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="go-meeting-btn btn-disabled"
                            disabled={true}
                          >
                            {!isTimeValid &&
                            (req.rawStatus === "PAID" ||
                              req.rawStatus === "IN_PROGRESS")
                              ? "Not In Time"
                              : "Ended"}
                          </button>
                        )}
                      </span>

                      <span className="cell-action">
                        <button
                          type="button"
                          className={`update-btn ${isOpen ? "is-open" : ""} ${
                            isFinalized ? "btn-disabled" : ""
                          }`}
                          onClick={() => !isFinalized && toggleExpand(req.id)}
                          disabled={isFinalized}
                        >
                          {isFinalized ? "Done" : "Update"}
                        </button>
                      </span>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && (
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
                                disabled={isFinalized}
                                readOnly={isFinalized}
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
                                disabled={isFinalized}
                                className="decision-btn no-show-btn"
                                onClick={() =>
                                  finalizeStatus(req.id, "no-show")
                                }
                              >
                                No-show
                              </button>

                              <button
                                type="button"
                                disabled={!isAwaitingReview || isFinalized}
                                className="decision-btn done-btn"
                                onClick={() => finalizeStatus(req.id, "done")}
                              >
                                {isFinalized ? "Completed" : "Done"}
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
            Marked {STATUS_LABEL[toast.status] || toast.status} for {toast.name}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RDashboard;
