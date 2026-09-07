"use client";
import { useState, useRef, useEffect } from "react";
import FeedbackPanel from "../FeedbackPanel/FeedbackPanel";
import FeedbackCard from "../FeedbackPanel/FeedbackCard";
import NavigationBar from "../NavigationBar/NavigationBar";
import ChatPanel from "../ChatPanel/ChatPanel";
import "./FeedbackPage.css";

// TODO: confirm this matches wherever the backend is actually reachable
// from the browser (same value used on the CV Assessment / Booking pages).
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Maps a raw Booking (from the backend) into the shape FeedbackPanel renders.
// TODO: confirm the real field names on User/Position — "fullName" and
// "title" below are placeholders, not verified against those entities.
const mapBookingToMeeting = (booking) => ({
  id: booking.bookingId,
  date: booking.bookingDate,
  time: `${booking.startTime}-${booking.endTime}`,
  interviewer: booking.interviewer?.fullName || "Unknown interviewer",
  about: booking.position?.title || "Unknown position",
  status: booking.status,
});

const FeedbackPage = () => {
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  const [activeMeeting, setActiveMeeting] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const fetchFinishedMeetings = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        // TODO: confirm this endpoint. Assumes it returns bookings with
        // status=DONE for the current authenticated user, and that it
        // already excludes bookings that have a review — if not, this
        // needs an extra filter (e.g. `booking.bookingReviewList.length === 0`).
        const res = await fetch(`${API_BASE}/api/bookings?status=DONE`, {
          credentials: "include", // send auth cookie/session if that's how auth works here
        });
        if (!res.ok) throw new Error(`Failed to load bookings (${res.status})`);
        const data = await res.json();
        setMeetings(data.map(mapBookingToMeeting));
      } catch (err) {
        setLoadError(err.message || "Could not load finished meetings.");
      } finally {
        setLoading(false);
      }
    };

    fetchFinishedMeetings();
  }, []);

  const handleGiveFeedback = (meeting) => {
    setActiveMeeting(meeting);
  };

  const handleClose = () => setActiveMeeting(null);

  const handleSubmit = async ({ meeting, rating, comments }) => {
    try {
      // BookingReview payload — matches rating (Double), comment (String),
      // booking (relation, sent as bookingId).
      const res = await fetch(`${API_BASE}/api/booking-reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bookingId: meeting.id,
          rating,
          comment: comments,
        }),
      });
      if (!res.ok) throw new Error(`Failed to submit review (${res.status})`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Submitting feedback failed", err);
      // Keep it simple: still proceed with the UI animation even on error
      // for now, but this should surface an error state to the user.
      // TODO: show a real error toast/banner instead of only console.error.
    }

    setActiveMeeting(null);

    // mark as done (shows DONE badge)
    setMeetings((prev) =>
      prev.map((m) => (m.id === meeting.id ? { ...m, status: "done" } : m)),
    );

    // after a short delay, trigger removing animation (match CSS durations)
    setTimeout(() => {
      setMeetings((prev) =>
        prev.map((m) => (m.id === meeting.id ? { ...m, removing: true } : m)),
      );

      // perform FLIP removal for smooth repositioning of remaining rows
      setTimeout(() => {
        performFLIPRemoval(meeting.id);
      }, 80);
    }, 300);
  };

  const containerRef = useRef(null);

  const performFLIPRemoval = (removedId) => {
    const container = containerRef.current;
    if (!container) {
      setMeetings((prev) => prev.filter((m) => m.id !== removedId));
      return;
    }

    // capture first positions
    const rows = Array.from(container.querySelectorAll(".feedback-table-row"));
    const firstRects = new Map();
    rows.forEach((node) => {
      const id = node.getAttribute("data-id");
      firstRects.set(id, node.getBoundingClientRect());
    });

    // remove the item from state (DOM will update)
    setMeetings((prev) => prev.filter((m) => m.id !== removedId));

    // next frame: invert and play animation
    requestAnimationFrame(() => {
      const newRows = Array.from(
        container.querySelectorAll(".feedback-table-row"),
      );
      newRows.forEach((node) => {
        const id = node.getAttribute("data-id");
        const first = firstRects.get(id);
        if (!first) return; // removed node
        const last = node.getBoundingClientRect();
        const deltaY = first.top - last.top;
        if (deltaY) {
          node.style.transition = "none";
          node.style.transform = `translateY(${deltaY}px)`;
          // force reflow
          node.getBoundingClientRect();
          node.style.transition = "transform 520ms cubic-bezier(.22,.9,.25,1)";
          node.style.transform = "";
          const cleanup = () => {
            node.style.transition = "";
            node.style.transform = "";
            node.removeEventListener("transitionend", cleanup);
          };
          node.addEventListener("transitionend", cleanup);
        }
      });
    });
  };

  return (
    <div className="feedback-page">
      <NavigationBar
        isCollapsed={navCollapsed}
        setIsCollapsed={setNavCollapsed}
      />
      <main className="feedback-main">
        <div className="feedback-content">
          {loading ? (
            <p className="feedback-loading">Loading finished meetings…</p>
          ) : loadError ? (
            <p className="feedback-load-error">{loadError}</p>
          ) : (
            <FeedbackPanel
              meetings={meetings}
              onGiveFeedback={handleGiveFeedback}
              containerRef={containerRef}
            />
          )}
        </div>
      </main>

      {activeMeeting && (
        <FeedbackCard
          meeting={activeMeeting}
          onClose={handleClose}
          onSubmit={handleSubmit}
        />
      )}

      {chatCollapsed && (
        <div
          className="chat-trigger-header"
          onClick={() => setChatCollapsed(false)}
        >
          <div className="chatbot-icon">
            <img src="/logo.png" alt="Chatbot Icon" />
          </div>
          <span className="user-name">John</span>
          <div className="user-avatar">
            <img src="/user.png" alt="User Avatar" />
          </div>
        </div>
      )}

      <ChatPanel
        isCollapsed={chatCollapsed}
        onClose={() => setChatCollapsed(true)}
      />
    </div>
  );
};

export default FeedbackPage;
