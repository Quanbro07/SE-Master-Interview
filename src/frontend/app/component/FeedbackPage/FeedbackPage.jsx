"use client";
import FeedbackPanel from "../FeedbackPanel/FeedbackPanel";
import FeedbackCard from "../FeedbackPanel/FeedbackCard";
import NavigationBar from "../NavigationBar/NavigationBar";
import ChatPanel from "../ChatPanel/ChatPanel";
import "./FeedbackPage.css";
import { useState, useRef } from "react";

const FeedbackPage = () => {
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  const [activeMeeting, setActiveMeeting] = useState(null);
  const [meetings, setMeetings] = useState([
    {
      id: 1,
      date: "20/06/2026",
      time: "19:30",
      interviewer: "Mr Alex Nguyễn",
      about: "Java Developer",
    },
    {
      id: 2,
      date: "21/06/2026",
      time: "20:30",
      interviewer: "Mr Alex Nguyễn",
      about: "Java Developer",
    },
    {
      id: 3,
      date: "21/06/2026",
      time: "20:30",
      interviewer: "Mr Alex Nguyễn",
      about: "Java Developer",
    },
  ]);

  const handleGiveFeedback = (meeting) => {
    setActiveMeeting(meeting);
  };

  const handleClose = () => setActiveMeeting(null);

  const handleSubmit = ({ meeting, rating, comments }) => {
    // TODO: call backend API to submit feedback. For now update UI state and animate removal.
    // eslint-disable-next-line no-console
    console.log("Submitting feedback", { meeting, rating, comments });
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
          <FeedbackPanel
            meetings={meetings}
            onGiveFeedback={handleGiveFeedback}
            containerRef={containerRef}
          />
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
