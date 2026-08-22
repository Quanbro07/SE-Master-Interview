"use client";
import { useMemo, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RNavigationBar from "../RNavigationBar/RNavigationBar";
import UserHeader from "../UserHeader/UserHeader";
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

const convertBookingToDashboardRow = (booking) => {
  if (!booking) return null;

  const startTimeStr = booking.startTime || booking.start_time;
  const endTimeStr = booking.endTime || booking.end_time;
  const startTime = new Date(startTimeStr);
  const endTime = new Date(endTimeStr);

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

  const candidateReview = booking.bookingReview || booking.booking_review;
  const candidateComment = candidateReview?.comment || "";
  const resultData =
    booking.interviewResult ||
    booking.interview_result ||
    booking.interviewResultResponseDTO;

  let safeInterviewerFeedback = "";

  if (typeof resultData === "string") {
    safeInterviewerFeedback = resultData;
  } else if (resultData && typeof resultData.overallComment === "string") {
    safeInterviewerFeedback = resultData.overallComment;
  } else if (resultData && typeof resultData.overall_comment === "string") {
    safeInterviewerFeedback = resultData.overall_comment;
  } else if (typeof booking.feedback === "string") {
    safeInterviewerFeedback = booking.feedback;
  }

  return {
    id: `booking-${cleanId}`,
    bookingId: Number(cleanId),
    date: dateStr,
    time: timeStr,
    interviewee: intervieweeName,
    about: booking.positionName || "Mock Interview",
    rawStatus: rawStatus,
    status: mapBookingStatus(rawStatus),
    feedback: safeInterviewerFeedback,
    candidateComment: candidateComment,
    hasInterviewerFeedback: Boolean(safeInterviewerFeedback.trim()),
    money: `$${booking.total_amount || booking.totalAmount || 10}`,
    meetingUrl: booking.meetingUrl || booking.meeting_url,
    startUrl: booking.startUrl || booking.start_url,
    endDateTime: !isNaN(endTime) ? endTime : null,
    rawBooking: booking,
  };
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

const isMeetingTimeValid = (dateStr, timeStr) => {
  const meetingTimestamp = toTimestamp(dateStr, timeStr);
  if (!meetingTimestamp) return false;

  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  return (
    now >= meetingTimestamp - ONE_HOUR && now <= meetingTimestamp + ONE_HOUR
  );
};

const isPastMeetingEnd = (dateStr, timeStr, endDateTime, now = Date.now()) => {
  const endTimestamp = endDateTime
    ? endDateTime.getTime()
    : toTimestamp(dateStr, timeStr) + 60 * 60 * 1000;

  if (!endTimestamp) return false;
  return now > endTimestamp;
};

const TERMINAL_STATUSES = ["COMPLETED", "REJECTED", "CANCELLED"];

const RDashboard = () => {
  const [user, setUser] = useState(null);
  const [submittedBookings, setSubmittedBookings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joiningId, setJoiningId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error("Lỗi khi đọc thông tin người dùng:", err);
      }
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const headers = authHeaders();

    if (!headers.Authorization) {
      setError("Bạn chưa đăng nhập hoặc Session đã hết hạn.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/booking/all-bookings`, {
        headers,
      });

      if (res.status === 401) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        return;
      }

      if (!res.ok) {
        throw new Error(`Lỗi Server (${res.status})`);
      }

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
      console.error("Lỗi tải danh sách booking:", err);
      setError(err.message || "Không thể tải danh sách cuộc họp.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleGoToMeeting = async (bookingId, defaultStartUrl) => {
    if (!bookingId || isNaN(Number(bookingId))) {
      alert("Booking ID không hợp lệ!");
      return;
    }

    const headers = authHeaders();
    if (!headers.Authorization) {
      alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
      return;
    }

    setJoiningId(bookingId);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/booking/${bookingId}/start-url`,
        {
          method: "GET",
          headers: authHeaders(),
        },
      );

      if (res.ok) {
        let freshStartUrl = await res.text();
        if (freshStartUrl) {
          freshStartUrl = freshStartUrl.trim().replace(/^"+|"+$/g, "");
        }

        if (freshStartUrl && freshStartUrl.startsWith("http")) {
          window.open(freshStartUrl, "_blank", "noopener,noreferrer");
          loadBookings();
          return;
        }
      }

      if (defaultStartUrl) {
        const cleanDefaultUrl = defaultStartUrl.trim().replace(/^"+|"+$/g, "");
        window.open(cleanDefaultUrl, "_blank", "noopener,noreferrer");
        loadBookings();
      } else {
        alert("Không thể khởi tạo link Zoom.");
      }
    } catch (err) {
      if (defaultStartUrl) {
        window.open(defaultStartUrl, "_blank", "noopener,noreferrer");
        loadBookings();
      } else {
        alert("Có lỗi mạng xảy ra khi tạo cuộc họp.");
      }
    } finally {
      setJoiningId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next) {
        const targetReq = requests.find((r) => r.id === id);
        const initFeedback =
          typeof targetReq?.feedback === "string" ? targetReq.feedback : "";

        setFeedbackDrafts((drafts) => ({
          ...drafts,
          [id]: drafts[id] !== undefined ? drafts[id] : initFeedback,
        }));
      }
      return next;
    });
  };

  const updateFeedbackDraft = (id, value) => {
    setFeedbackDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const finalizeStatus = async (id) => {
    const target = requests.find((r) => r.id === id);
    if (!target || !target.bookingId) {
      alert("Không tìm thấy Booking ID hợp lệ!");
      return;
    }

    const rawFeedback =
      feedbackDrafts[req.id] !== undefined
        ? feedbackDrafts[req.id]
        : req.feedback || "";
    const currentFeedback = typeof rawFeedback === "string" ? rawFeedback : "";
    const isFeedbackProvided = Boolean(currentFeedback.trim());

    if (!feedbackText.trim()) {
      alert("Vui lòng điền đánh giá (feedback) trước khi nhấn Complete!");
      return;
    }

    const cleanBookingId = Number(target.bookingId);
    setSubmittingId(id);

    const payload = {
      booking_id: cleanBookingId,
      technical_score: 8,
      communication_score: 8,
      preparation_level: "WELL_PREPARED",
      overall_comment: feedbackText.slice(0, 500),
    };

    try {
      const res = await fetch(`${API_BASE}/api/v1/booking/complete`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || `Lỗi status ${res.status}`);
      }

      setSubmittedBookings((prev) => [...prev, cleanBookingId]);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "done",
                rawStatus: "COMPLETED",
                feedback: feedbackText,
                hasInterviewerFeedback: true,
              }
            : r,
        ),
      );
      setExpandedId(null);
      setToast({ name: target?.interviewee, status: "done" });
      setTimeout(() => setToast(null), 2200);
      loadBookings();
    } catch (err) {
      alert("Cập nhật thất bại: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const sortedRequests = useMemo(() => {
    const getStatusPriority = (item) => {
      const st = item.rawStatus;
      const autoCancelled =
        !TERMINAL_STATUSES.includes(st) &&
        !submittedBookings.includes(item.bookingId) &&
        isPastMeetingEnd(item.date, item.time, item.endDateTime);

      if (autoCancelled) return 4;
      if (
        st === "ACCEPTED" ||
        st === "PAID" ||
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
  }, [requests, submittedBookings, nowTick]);

  return (
    <div className="r-dashboard-root">
      <RNavigationBar />
      <UserHeader user={user} />

      <main className="r-dashboard-main">
        <section className="r-dashboard-inner">
          <h1 className="r-dashboard-title">-----DASHBOARD-----</h1>

          {error && <div className="r-dashboard-error-banner">{error}</div>}

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

                const rawFeedback =
                  feedbackDrafts[req.id] ?? req.feedback ?? "";
                const currentFeedback =
                  typeof rawFeedback === "string" ? rawFeedback : "";
                const isFeedbackProvided = Boolean(currentFeedback.trim());

                // eslint-disable-next-line no-unused-vars
                const _tick = nowTick;

                const displayRawStatus = req.rawStatus;
                const displayStatusClass = req.status;

                // Kiểm tra xem đã hoàn tất hoặc đã có feedback của Interviewer chưa
                const isFinalized =
                  req.rawStatus === "COMPLETED" ||
                  req.hasInterviewerFeedback ||
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
                      <span
                        className={`cell-status status-${displayStatusClass}`}
                      >
                        {STATUS_LABEL[displayStatusClass] || displayRawStatus}
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
                            {req.rawStatus === "CANCELLED" ||
                            req.rawStatus === "REJECTED"
                              ? "Cancelled"
                              : !isTimeValid &&
                                  (req.rawStatus === "PAID" ||
                                    req.rawStatus === "ACCEPTED" ||
                                    req.rawStatus === "IN_PROGRESS")
                                ? "Not In Time"
                                : "Ended"}
                          </button>
                        )}
                      </span>

                      <span className="cell-action">
                        <button
                          type="button"
                          className={`update-btn ${isOpen ? "is-open" : ""}`}
                          onClick={() => toggleExpand(req.id)}
                        >
                          Update
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
                                value={currentFeedback}
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
                                disabled={
                                  !isFeedbackProvided ||
                                  isFinalized ||
                                  submittingId === req.id
                                }
                                className="decision-btn done-btn"
                                onClick={() => finalizeStatus(req.id)}
                              >
                                {submittingId === req.id
                                  ? "SUBMITTING..."
                                  : isFinalized
                                    ? "COMPLETED"
                                    : "COMPLETE"}
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

            {sortedRequests.length === 0 && !loading && (
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
