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

  const rawStatus =
    booking.bookingStatus || booking.booking_status || booking.status;

  const cleanId = booking.bookingId ?? booking.booking_id;

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
    money: `$${booking.totalAmount || 5}`,
    meetingUrl: booking.meetingUrl || booking.meeting_url,
    startUrl: booking.startUrl || booking.start_url,
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
          const st = b.bookingStatus || b.booking_status || b.status;
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

      if (defaultStartUrl) {
        window.open(defaultStartUrl, "_blank", "noopener,noreferrer");
      } else {
        alert("Không thể khởi tạo link Zoom. Vui lòng kiểm tra lại!");
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
        const cleanBookingId = Number(target.bookingId);

        if (isNaN(cleanBookingId)) {
          throw new Error("Mã Booking không hợp lệ.");
        }

        // 🟢 Cắt bớt feedback nếu dài hơn 500 ký tự (tránh vượt giới hạn 512 ký tự của DB)
        const safeComment = feedbackText.slice(0, 500);

        // 🟢 Khởi tạo Payload CHÍNH XÁC theo DTO & Enum Backend
        const payload = {
          booking_id: cleanBookingId,
          technical_score: 8, // Kiểu số Long (1-100)
          communication_score: 8, // Kiểu số Long (1-100)

          // 🛑 ĐÃ SỬA: Dùng 1 trong 3 giá trị Enum: "WELL_PREPARED", "MODERATE", hoặc "UNDER_PREPARED"
          preparation_level: "WELL_PREPARED",

          overall_comment: safeComment,
        };

        // 🔍 Console log kiểm tra Payload trước khi gửi
        console.log("====================");
        console.log("📤 Sending Payload to /api/v1/booking/complete:", payload);

        const res = await fetch(`${API_BASE}/api/v1/booking/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify(payload),
        });

        console.log("📥 Response Status:", res.status);

        if (!res.ok) {
          const errText = await res.text();
          console.error("❌ Backend Error Details:", errText);
          throw new Error(errText || `Failed with status ${res.status}`);
        }

        const resData = await res.json();
        console.log("✅ Response Data from Backend:", resData);
        console.log("====================");

        // Đánh dấu đã submit thành công
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

                // 🟢 KIỂM TRA XEM ĐÃ HOÀN THÀNH HOẶC VỪA SUBMIT CHƯA
                const isSubmittedLocally = submittedBookings.includes(
                  req.bookingId,
                );
                const isFinalized =
                  req.status !== "in-progress" ||
                  req.rawStatus === "COMPLETED" ||
                  isSubmittedLocally;

                const isAwaitingReview = req.rawStatus === "AWAIT_REVIEW";

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
                        {isAwaitingReview && !isSubmittedLocally
                          ? "Await Review"
                          : STATUS_LABEL[req.status]}
                      </span>

                      <span className="cell-meeting">
                        {req.status === "in-progress" &&
                        !isAwaitingReview &&
                        !isSubmittedLocally ? (
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
                          <button
                            type="button"
                            className="go-meeting-btn btn-disabled"
                            disabled={true}
                            style={{ opacity: 0.5, cursor: "not-allowed" }}
                          >
                            Ended
                          </button>
                        )}
                      </span>

                      <span className="cell-action">
                        {/* Khi đã finalized thì nút Update đổi sang xám/disabled */}
                        <button
                          type="button"
                          className={`update-btn ${isOpen ? "is-open" : ""} ${
                            isFinalized ? "is-disabled" : ""
                          }`}
                          onClick={() => !isFinalized && toggleExpand(req.id)}
                          disabled={isFinalized}
                          style={
                            isFinalized
                              ? { opacity: 0.5, cursor: "not-allowed" }
                              : {}
                          }
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
                              {/* 🟢 Khóa ô nhập liệu khi đã COMPLETED hoặc đã Submit */}
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
                                style={
                                  isFinalized
                                    ? { opacity: 0.5, cursor: "not-allowed" }
                                    : {}
                                }
                                onClick={() =>
                                  finalizeStatus(req.id, "no-show")
                                }
                              >
                                No-show
                              </button>

                              {/* 🟢 Vô hiệu hóa nút DONE nếu không trong trạng thái AWAIT_REVIEW hoặc đã Finalized */}
                              <button
                                type="button"
                                disabled={!isAwaitingReview || isFinalized}
                                className={`decision-btn done-btn ${
                                  !isAwaitingReview || isFinalized
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                style={
                                  !isAwaitingReview || isFinalized
                                    ? { opacity: 0.5, cursor: "not-allowed" }
                                    : {}
                                }
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
            Marked {STATUS_LABEL[toast.status]} for {toast.name}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RDashboard;
