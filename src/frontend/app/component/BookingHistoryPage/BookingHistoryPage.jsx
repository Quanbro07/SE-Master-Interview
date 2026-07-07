"use client";
import { useMemo, useState } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./BookingHistoryPage.css";

const interviewEvents = [
  {
    date: "2026-06-01",
    time: "10:00",
    interviewer: "Mr Alex Nguyễn",
    description: "Technical round – system design",
  },
  {
    date: "2026-06-10",
    time: "20:30",
    interviewer: "Mr Khoa Phạm",
    description: "HR round – culture fit",
  },
  {
    date: "2026-06-10",
    time: "22:00",
    interviewer: "Mr Alex Nguyễn",
    description: "Follow-up technical deep dive",
  },
  {
    date: "2026-06-18",
    time: "15:00",
    interviewer: "Ms Linh Tran",
    description: "Final round – offer discussion",
  },
];

const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BookingHistoryPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 5, 1));

  const monthLabel = useMemo(
    () =>
      currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" }),
    [currentMonth],
  );

  const monthStart = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    [currentMonth],
  );

  const firstWeekdayIndex = useMemo(
    () => (monthStart.getDay() + 6) % 7,
    [monthStart],
  );

  const daysInMonth = useMemo(
    () =>
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0,
      ).getDate(),
    [currentMonth],
  );

  const dayCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstWeekdayIndex; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
      );
    }
    // pad the trailing row so the grid always ends on a full week
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [firstWeekdayIndex, daysInMonth, currentMonth]);

  const eventsByDate = useMemo(() => {
    return interviewEvents.reduce((acc, event) => {
      acc[event.date] = acc[event.date] || [];
      acc[event.date].push(event);
      return acc;
    }, {});
  }, []);

  const formatEventDate = (dayString, time) => {
    const [y, m, d] = dayString.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dateLabel = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${dateLabel}, ${time}`;
  };

  return (
    <div className="booking-history-root">
      <NavigationBar />
      <main className="booking-history-main">
        <section className="booking-history-inner">
          <div className="booking-history-title-row">
            <div className="booking-history-title">
              -----BOOKING HISTORY-----
            </div>
            <p>
              Review your past bookings and follow up on scheduled interviews.
            </p>
          </div>

          <div className="history-calendar-card">
            <div className="calendar-controls">
              <button
                type="button"
                className="calendar-nav-button"
                onClick={() =>
                  setCurrentMonth(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
              >
                ‹
              </button>
              <div className="calendar-header">{monthLabel}</div>
              <button
                type="button"
                className="calendar-nav-button"
                onClick={() =>
                  setCurrentMonth(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
              >
                ›
              </button>
            </div>

            <div className="calendar-grid">
              <div className="calendar-grid-row calendar-weekdays">
                {weekdayNames.map((label) => (
                  <span key={label} className="calendar-weekday-cell">
                    {label}
                  </span>
                ))}
              </div>

              <div className="calendar-grid-body">
                {dayCells.map((date, index) => {
                  const dayString = date
                    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                    : null;
                  const events = dayString ? eventsByDate[dayString] || [] : [];
                  const isLastCol = index % 7 === 6;
                  const isLastRow = index >= dayCells.length - 7;

                  return (
                    <div
                      key={index}
                      className={[
                        "calendar-day",
                        !date ? "empty" : "",
                        events.length > 0 ? "has-event" : "",
                        isLastCol ? "no-border-right" : "",
                        isLastRow ? "no-border-bottom" : "",
                      ]
                        .join(" ")
                        .trim()}
                    >
                      {date ? (
                        <>
                          <div className="calendar-day-number">
                            {date.getDate()}
                          </div>

                          {events.length > 0 && (
                            <div
                              className="calendar-event-tooltip"
                              role="tooltip"
                            >
                              <div className="tooltip-arrow" />
                              <div className="tooltip-heading">
                                {date.toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                              {events.map((event) => (
                                <div
                                  key={`tip-${dayString}-${event.time}-${event.interviewer}`}
                                  className="tooltip-event"
                                >
                                  <div className="tooltip-row">
                                    <span className="tooltip-label">Time</span>
                                    <span className="tooltip-value">
                                      {formatEventDate(dayString, event.time)}
                                    </span>
                                  </div>
                                  <div className="tooltip-row">
                                    <span className="tooltip-label">With</span>
                                    <span className="tooltip-value">
                                      {event.interviewer}
                                    </span>
                                  </div>
                                  {event.description && (
                                    <div className="tooltip-row">
                                      <span className="tooltip-label">
                                        Details
                                      </span>
                                      <span className="tooltip-value">
                                        {event.description}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BookingHistoryPage;
