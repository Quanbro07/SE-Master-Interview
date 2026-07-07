"use client";
import { useEffect, useRef, useState } from "react";
import {
  addDays,
  addWeeks,
  format,
  isSameMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";
import RNavigationBar from "../RNavigationBar/RNavigationBar";
import "./RCalendar.css";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 9:00 -> 20:00
const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Key helpers ---------------------------------------------------------
// Non-repeating slots are keyed to a specific calendar date: "2026-06-02-14"
// Repeating slots are keyed to a weekday index only: "2-14" (Wed 14:00),
// so the same pattern shows up on every week you navigate to.
const dateKey = (date, hour) => `${format(date, "yyyy-MM-dd")}-${hour}`;
const repeatKey = (weekdayIndex, hour) => `${weekdayIndex}-${hour}`;

const RCalendar = () => {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [repeatWeekly, setRepeatWeekly] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState(new Set()); // specific-date mode
  const [repeatSlots, setRepeatSlots] = useState(new Set()); // repeat-weekly mode

  const isDraggingRef = useRef(false);
  const dragValueRef = useRef(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month label: based on the Sunday of the visible week, since most of a
  // Mon-Sun week usually belongs to that month.
  const monthLabel = format(weekDays[6], "MMMM yyyy");

  const goPrevWeek = () => setWeekStart((prev) => subWeeks(prev, 1));
  const goNextWeek = () => setWeekStart((prev) => addWeeks(prev, 1));

  const isSlotSelected = (date, hour, weekdayIndex) => {
    if (repeatWeekly) return repeatSlots.has(repeatKey(weekdayIndex, hour));
    return selectedSlots.has(dateKey(date, hour));
  };

  const setSlot = (date, hour, weekdayIndex, value) => {
    if (repeatWeekly) {
      setRepeatSlots((prev) => {
        const next = new Set(prev);
        const key = repeatKey(weekdayIndex, hour);
        if (value) next.add(key);
        else next.delete(key);
        return next;
      });
    } else {
      setSelectedSlots((prev) => {
        const next = new Set(prev);
        const key = dateKey(date, hour);
        if (value) next.add(key);
        else next.delete(key);
        return next;
      });
    }
  };

  const handleMouseDown = (date, hour, weekdayIndex) => {
    if (!isEditing) return;
    const current = isSlotSelected(date, hour, weekdayIndex);
    const nextValue = !current;
    dragValueRef.current = nextValue;
    isDraggingRef.current = true;
    setSlot(date, hour, weekdayIndex, nextValue);
  };

  const handleMouseEnter = (date, hour, weekdayIndex) => {
    if (!isEditing || !isDraggingRef.current) return;
    setSlot(date, hour, weekdayIndex, dragValueRef.current);
  };

  useEffect(() => {
    const stopDragging = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("mouseup", stopDragging);
    return () => window.removeEventListener("mouseup", stopDragging);
  }, []);

  // Converts between "specific date" storage and "repeat weekly" storage
  // so flipping the toggle carries the pattern the user already built,
  // instead of losing it.
  const handleToggleRepeat = () => {
    if (!repeatWeekly) {
      // Turning repeat ON: take this visible week's specific selections
      // and promote them into the weekday-based repeat pattern.
      setRepeatSlots((prev) => {
        const next = new Set(prev);
        weekDays.forEach((date, weekdayIndex) => {
          HOURS.forEach((hour) => {
            if (selectedSlots.has(dateKey(date, hour))) {
              next.add(repeatKey(weekdayIndex, hour));
            }
          });
        });
        return next;
      });
    } else {
      // Turning repeat OFF: bake the current repeat pattern into this
      // visible week's specific dates so nothing visually changes.
      setSelectedSlots((prev) => {
        const next = new Set(prev);
        weekDays.forEach((date, weekdayIndex) => {
          HOURS.forEach((hour) => {
            if (repeatSlots.has(repeatKey(weekdayIndex, hour))) {
              next.add(dateKey(date, hour));
            }
          });
        });
        return next;
      });
    }
    setRepeatWeekly((prev) => !prev);
  };

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
  };

  return (
    <div className="r-calendar-root">
      <RNavigationBar />
      <main className="r-calendar-main">
        <section className="r-calendar-inner">
          <h1 className="r-calendar-title">-----CALENDAR-----</h1>

          <div className={`r-calendar-card ${isEditing ? "is-editing" : ""}`}>
            <div className="r-calendar-topbar">
              <div className="timezone-field">
                <span className="topbar-label">TIMEZONE</span>
                <span className="timezone-pill">GMT+7</span>
              </div>
              <label className="repeat-field">
                <span className="topbar-label">REPEAT WEEKLY</span>
                <input
                  type="checkbox"
                  className="repeat-checkbox"
                  checked={repeatWeekly}
                  onChange={handleToggleRepeat}
                />
              </label>
            </div>

            <div className="r-calendar-nav-row">
              <button
                type="button"
                className="week-nav-btn"
                onClick={goPrevWeek}
                aria-label="Previous week"
              >
                ‹
              </button>
              <h2 className="month-label">{monthLabel}</h2>
              <button
                type="button"
                className="week-nav-btn"
                onClick={goNextWeek}
                aria-label="Next week"
              >
                ›
              </button>
            </div>

            <div className="r-calendar-grid">
              <div className="grid-header-row">
                <div className="grid-time-col-spacer" />
                {weekDays.map((date, i) => (
                  <div
                    key={i}
                    className={`grid-day-header ${!isSameMonth(date, weekDays[6]) ? "faded-month" : ""}`}
                  >
                    <span className="weekday-name">{WEEKDAY_LABELS[i]}</span>
                    <span className="weekday-date">{format(date, "d")}</span>
                  </div>
                ))}
              </div>

              {HOURS.map((hour) => (
                <div key={hour} className="grid-hour-row">
                  <div className="grid-time-label">{hour}:00</div>
                  {weekDays.map((date, weekdayIndex) => {
                    const selected = isSlotSelected(date, hour, weekdayIndex);
                    return (
                      <button
                        key={weekdayIndex}
                        type="button"
                        className={`slot-cell ${selected ? "is-selected" : ""} ${!isEditing ? "is-locked" : ""}`}
                        onMouseDown={() =>
                          handleMouseDown(date, hour, weekdayIndex)
                        }
                        onMouseEnter={() =>
                          handleMouseEnter(date, hour, weekdayIndex)
                        }
                        aria-pressed={selected}
                        aria-label={`${WEEKDAY_LABELS[weekdayIndex]} ${format(date, "MMM d")} ${hour}:00`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="r-calendar-footer">
              <button
                type="button"
                className={`edit-save-btn ${isEditing ? "save-mode" : "edit-mode"}`}
                onClick={handleEditToggle}
              >
                {isEditing ? "SAVE" : "EDIT"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default RCalendar;
