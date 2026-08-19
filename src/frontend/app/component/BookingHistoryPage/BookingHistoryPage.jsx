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
    case "CANCELLED":
      return "cancelled";
    default:
      return "in-progress";
  }
};

// Convert backend booking object to candidate dashboard row
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

  return {
    id: `booking-${booking.bookingId || booking.booking_id}`,
    bookingId: booking.bookingId || booking.booking_id,
    date: dateStr,
    time: timeStr,
    interviewer: interviewerName,
    about: booking.positionName || "Mock Interview",
    rawStatus:
      booking.bookingStatus || booking.booking_status || booking.status,
    status: mapBookingStatus(
      booking.bookingStatus || booking.booking_status || booking.status,
    ),
    // Lấy join_url cho Candidate
    joinUrl:
      booking.joinUrl ||
      booking.join_url ||
      booking.meetingUrl ||
      booking.meeting_url,
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

// Hàm kiểm tra xem đã tới giờ vào phỏng vấn chưa (Cho phép vào trước 15 phút)
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

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/booking/my-bookings`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        // Fallback endpoint nếu backend dùng chung api all-bookings
        const fallbackRes = await fetch(
          `${API_BASE}/api/v1/booking/all-bookings`,
          {
            headers: authHeaders(),
          },
        );
        if (!fallbackRes.ok)
          throw new Error(`Failed to load booking data (${res.status})`);
        const bookings = await fallbackRes.json();
        const dashboardBookings = (Array.isArray(bookings) ? bookings : [])
          .map((b) => convertBookingToDashboardRow(b))
          .filter((r) => r !== null);
        setRequests(dashboardBookings);
        return;
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
      alert(
        "Chưa tìm thấy link Zoom cho buổi phỏng vấn này. Vui lòng thử lại sau!",
      );
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
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
                  const isReadyToJoin = isMeetingTimeValid(req.date, req.time);

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
                          {STATUS_LABEL[req.status]}
                        </span>

                        {/* Cột Join Meeting */}
                        <span className="cell-meeting">
                          {req.status === "in-progress" ? (
                            <button
                              type="button"
                              className={`join-meeting-btn ${!isReadyToJoin ? "btn-disabled" : ""}`}
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
                            <span className="cell-meeting-disabled">-</span>
                          )}
                        </span>

                        {/* Nút Xem Chi Tiết */}
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

                      {/* Panel Chi Tiết Buổi Phỏng Vấn */}
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

                              {req.rawBooking?.reviewResponseDTO && (
                                <div className="details-field">
                                  <span className="details-label">
                                    Interviewer's Feedback
                                  </span>
                                  <div className="feedback-box">
                                    {req.rawBooking.reviewResponseDTO
                                      .overallComment || "No comment provided."}
                                  </div>
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
