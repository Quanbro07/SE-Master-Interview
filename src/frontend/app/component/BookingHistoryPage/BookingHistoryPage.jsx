"use client";
import { useMemo, useState } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./BookingHistoryPage.css";

const interviewEvents = [
  { date: "2026-06-01", time: "10:00", interviewer: "Mr Alex Nguyễn" },
  { date: "2026-06-10", time: "20:30", interviewer: "Mr Khoa Phạm" },
  { date: "2026-06-10", time: "22:00", interviewer: "Mr Alex Nguyễn" },
  { date: "2026-06-18", time: "15:00", interviewer: "Ms Linh Tran" },
];

const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BookingHistoryPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 5, 1));

  const monthLabel = useMemo(
    () => currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" }),
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
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate(),
    [currentMonth],
  );

  const dayCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstWeekdayIndex; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
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

  return (
    <div className="booking-history-root">
      <NavigationBar />
      <main className="booking-history-main">
        <section className="booking-history-inner">
          <div className="booking-history-title-row">
            <h1>Booking History</h1>
            <p>Review your past bookings and follow up on scheduled interviews.</p>
          </div>

          <div className="history-calendar-card">
            <div className="calendar-controls">
              <button
                type="button"
                className="calendar-nav-button"
                onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              >
                ‹
              </button>
              <div className="calendar-header">{monthLabel}</div>
              <button
                type="button"
                className="calendar-nav-button"
                onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              >
                ›
              </button>
            </div>

            <div className="calendar-days-grid calendar-weekdays">
              {weekdayNames.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="calendar-days-grid calendar-dates">
              {dayCells.map((date, index) => {
                const dayString = date ? date.toISOString().slice(0, 10) : null;
                const events = dayString ? eventsByDate[dayString] || [] : [];
                return (
                  <div
                    key={index}
                    className={`calendar-day ${!date ? "empty" : ""} ${events.length > 0 ? "has-event" : ""}`}
                  >
                    {date ? (
                      <>
                        <div className="calendar-day-number">{date.getDate()}</div>
                        {events.map((event) => (
                          <div key={`${dayString}-${event.time}-${event.interviewer}`} className="calendar-event-label">
                            {event.interviewer}
                          </div>
                        ))}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BookingHistoryPage;
