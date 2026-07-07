"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RNavigationBar from "../RNavigationBar/RNavigationBar";
import "./RBookingRequest.css";

const initialRequests = [
  {
    id: "r1",
    date: "20/06/2026",
    time: "19:30",
    interviewee: "Ms Hạnh Cafe",
    about: "Java Developer",
    detail: {
      candidate: "Hạnh Cafe",
      requestDate: "June 25th, 2026",
      requestTime: "9:00 (GMT +7)",
      message:
        "Hi Mentor, I want to practice high-concurrency Java questions to prepare for my upcoming interview. Attached is my CV.",
      cvFileName: "Mariam_CV.pdf",
      cvFileSize: "2.1MB",
    },
  },
  {
    id: "r2",
    date: "21/06/2026",
    time: "20:30",
    interviewee: "Mr 田中さん",
    about: "Java Developer",
    detail: {
      candidate: "田中さん",
      requestDate: "June 26th, 2026",
      requestTime: "20:30 (GMT +7)",
      message:
        "Hello, I'd like to go through Spring Boot and microservices questions before my final round.",
      cvFileName: "Tanaka_CV.pdf",
      cvFileSize: "1.8MB",
    },
  },
  {
    id: "r3",
    date: "21/06/2026",
    time: "20:30",
    interviewee: "Mr Alex Nguyễn",
    about: "Java Developer",
    detail: {
      candidate: "Alex Nguyễn",
      requestDate: "June 26th, 2026",
      requestTime: "20:30 (GMT +7)",
      message:
        "Looking to practice system design and JVM performance tuning questions ahead of my interview.",
      cvFileName: "Alex_Nguyen_CV.pdf",
      cvFileSize: "1.4MB",
    },
  },
];

const BADGE_HOLD = 500; // ms the ACCEPTED/DENIED badge stays visible before swiping out
const EXIT_DURATION = 320; // ms swipe-left/fade duration, must match transition below

const RBookingRequest = () => {
  const [requests, setRequests] = useState(initialRequests);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDecision = (id, decision) => {
    const target = requests.find((r) => r.id === id);
    if (!target || target.decision) return;

    // Collapse the detail panel if this row was open, so it doesn't swipe
    // away with an open dropdown attached to it.
    setExpandedId((prev) => (prev === id ? null : prev));

    // Step 1: show the ACCEPTED / DENIED badge in place of the buttons.
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, decision } : r)),
    );

    // Step 2: after the badge has been visible for a moment, start the
    // swipe-left exit.
    setTimeout(() => {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, exiting: decision } : r)),
      );

      // Step 3: once the exit animation finishes, remove it from state.
      // `layout` on each row makes the rows below slide up automatically.
      setTimeout(() => {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        setToast({ name: target.interviewee, decision });
        setTimeout(() => setToast(null), 2200);
      }, EXIT_DURATION);
    }, BADGE_HOLD);
  };

  return (
    <div className="rbr-root">
      <RNavigationBar />
      <main className="rbr-main">
        <section className="rbr-inner">
          <h1 className="rbr-title">-----REQUESTS-----</h1>
          <p className="rbr-subtitle">REQUESTS' INFORMATION</p>

          <div className="rbr-table">
            <div className="rbr-row rbr-header">
              <span>DATE</span>
              <span>TIME</span>
              <span>INTERVIEWEE</span>
              <span>ABOUT</span>
              <span className="rbr-header-view"> </span>
              <span className="rbr-header-actions">
                <span>Accept</span>
                <span>Deny</span>
              </span>
            </div>

            <AnimatePresence>
              {requests.map((req) => {
                const isOpen = expandedId === req.id;
                return (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 1, x: 0 }}
                    animate={
                      req.exiting
                        ? { opacity: 0, x: -140 }
                        : { opacity: 1, x: 0 }
                    }
                    exit={{ opacity: 0, x: -140 }}
                    transition={{
                      duration: EXIT_DURATION / 1000,
                      ease: "easeInOut",
                    }}
                    className={`rbr-row-wrap ${req.exiting ? `is-${req.exiting}` : ""}`}
                  >
                    <div className="rbr-row rbr-data-row">
                      <span className="cell-date">{req.date}</span>
                      <span className="cell-time">{req.time}</span>
                      <span className="cell-interviewee">
                        {req.interviewee}
                      </span>
                      <span className="cell-about">{req.about}</span>

                      <span className="cell-view">
                        <button
                          type="button"
                          className={`view-request-btn ${isOpen ? "is-open" : ""}`}
                          onClick={() => toggleExpand(req.id)}
                        >
                          View request
                          <span className="view-request-caret">▾</span>
                        </button>
                      </span>

                      <span className="cell-actions">
                        {req.decision ? (
                          <span className={`decision-badge ${req.decision}`}>
                            {req.decision === "accepted"
                              ? "ACCEPTED"
                              : "DENIED"}
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="round-btn accept-btn"
                              onClick={() => handleDecision(req.id, "accepted")}
                              aria-label="Accept request"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="round-btn deny-btn"
                              onClick={() => handleDecision(req.id, "denied")}
                              aria-label="Deny request"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Dropdown detail panel */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="detail"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: "easeInOut" }}
                          className="rbr-detail-wrap"
                        >
                          <motion.div
                            initial={{ y: -8 }}
                            animate={{ y: 0 }}
                            exit={{ y: -8 }}
                            transition={{ duration: 0.28, ease: "easeInOut" }}
                            className="rbr-detail-panel"
                          >
                            <div className="detail-top-row">
                              <div className="detail-field">
                                <span className="detail-label">Candidate</span>
                                <div className="detail-pill">
                                  {req.detail.candidate}
                                </div>
                              </div>
                              <div className="detail-field">
                                <span className="detail-label">Date</span>
                                <div className="detail-pill">
                                  {req.detail.requestDate}
                                </div>
                              </div>
                              <div className="detail-field">
                                <span className="detail-label">Time</span>
                                <div className="detail-pill">
                                  {req.detail.requestTime}
                                </div>
                              </div>
                            </div>

                            <div className="detail-message-row">
                              <div className="detail-message-field">
                                <span className="detail-label">Message</span>
                                <div className="detail-message-box">
                                  {req.detail.message}
                                </div>
                              </div>
                              <div className="detail-cv-card">
                                <span className="cv-icon">PDF</span>
                                <span className="cv-filename">
                                  {req.detail.cvFileName}
                                </span>
                                <span className="cv-filesize">
                                  {req.detail.cvFileSize}
                                </span>
                              </div>
                            </div>

                            <p className="detail-note">
                              Please respond within 2 days to avoid automatic
                              cancellation and fund release.
                            </p>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {requests.length === 0 && (
              <motion.div
                className="rbr-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                No pending booking requests right now.
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
            className={`rbr-toast ${toast.decision}`}
          >
            {toast.decision === "accepted" ? "Accepted" : "Denied"} request from{" "}
            {toast.name}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RBookingRequest;
