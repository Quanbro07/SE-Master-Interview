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

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 9:00 -> 20:00 (kept as original range)
const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// TODO: confirm this matches wherever the backend is actually reachable
// from the browser (same value used elsewhere in the app).
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const dateKey = (date, hour) => `${format(date, "yyyy-MM-dd")}-${hour}`;
const repeatKey = (weekdayIndex, hour) => `${weekdayIndex}-${hour}`;

// TODO: unverified mapping. AvailableSchedule.dayOfWeek is constrained to
// 2-8 (@Min(2) @Max(8)), which doesn't match ISO DayOfWeek(1-7) directly.
// Assuming Monday=2 ... Sunday=8 to match this UI's Mon-first week
// (weekStartsOn: 1). Confirm against the real ScheduleService.
const weekdayIndexToDayOfWeek = (weekdayIndex) => weekdayIndex + 2;
const dayOfWeekToWeekdayIndex = (dayOfWeek) => dayOfWeek - 2;

const getAccessToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const mergeHoursIntoRanges = (hours) => {
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges = [];
  let rangeStart = null;
  let prev = null;

  sorted.forEach((hour) => {
    if (rangeStart === null) {
      rangeStart = hour;
    } else if (hour !== prev + 1) {
      ranges.push({ start: rangeStart, end: prev + 1 });
      rangeStart = hour;
    }
    prev = hour;
  });
  if (rangeStart !== null) ranges.push({ start: rangeStart, end: prev + 1 });

  return ranges;
};

const formatHourAsTime = (hour) => `${String(hour).padStart(2, "0")}:00:00`;

// TODO: confirm actual LocalTime serialization shape ("HH:mm:ss" assumed).
const parseHourFromTimeString = (value) => {
  if (!value) return null;
  const [hourStr] = value.split(":");
  return parseInt(hourStr, 10);
};

const RCalendar = () => {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [repeatWeekly, setRepeatWeekly] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState(new Set()); // specific-date mode
  const [repeatSlots, setRepeatSlots] = useState(new Set()); // repeat-weekly mode

  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockForm, setBlockForm] = useState({
    startTime: "",
    endTime: "",
    note: "",
  });
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockError, setBlockError] = useState(null);
  const [blockSuccess, setBlockSuccess] = useState(false);

  const isDraggingRef = useRef(false);
  const dragValueRef = useRef(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
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

  const handleToggleRepeat = () => {
    if (!repeatWeekly) {
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
    if (isEditing) {
      handleSaveSchedule();
    } else {
      setIsEditing(true);
    }
  };

  // Load recurring weekly availability whenever the visible week changes.
  useEffect(() => {
    const loadSchedule = async () => {
      setScheduleLoading(true);
      setScheduleError(null);
      try {
        const dateInWeek = format(weekDays[0], "yyyy-MM-dd");
        const res = await fetch(
          `${API_BASE}/api/v1/schedule/get?dateInWeek=${dateInWeek}`,
          { headers: authHeaders() },
        );
        if (!res.ok) throw new Error(`Failed to load schedule (${res.status})`);
        const data = await res.json();

        const nextRepeatSlots = new Set();
        (data.schedules || []).forEach((daySchedule) => {
          const weekdayIndex = dayOfWeekToWeekdayIndex(daySchedule.day_of_week);
          if (weekdayIndex < 0 || weekdayIndex > 6) return;
          (daySchedule.schedule_times || []).forEach((range) => {
            const startHour = parseHourFromTimeString(range.start_time);
            const endHour = parseHourFromTimeString(range.end_time);
            if (startHour == null || endHour == null) return;
            for (let h = startHour; h < endHour; h += 1) {
              nextRepeatSlots.add(repeatKey(weekdayIndex, h));
            }
          });
        });
        setRepeatSlots(nextRepeatSlots);
      } catch (err) {
        setScheduleError(err.message || "Could not load your schedule.");
      } finally {
        setScheduleLoading(false);
      }
    };

    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format(weekDays[0], "yyyy-MM-dd")]);

  // Save is only supported in repeat-weekly mode — AvailableSchedule has
  // no concept of a specific calendar date, only a recurring day_of_week.
  const handleSaveSchedule = async () => {
    if (!repeatWeekly) {
      setScheduleError(
        "Specific-date scheduling isn't supported by the backend yet — switch Repeat Weekly on to save.",
      );
      setIsEditing(false);
      return;
    }

    setSaving(true);
    setScheduleError(null);

    try {
      const hoursByWeekday = new Map();
      repeatSlots.forEach((key) => {
        const [weekdayIndexStr, hourStr] = key.split("-");
        const weekdayIndex = parseInt(weekdayIndexStr, 10);
        const hour = parseInt(hourStr, 10);
        if (!hoursByWeekday.has(weekdayIndex)) {
          hoursByWeekday.set(weekdayIndex, []);
        }
        hoursByWeekday.get(weekdayIndex).push(hour);
      });

      const schedules = Array.from(hoursByWeekday.entries()).map(
        ([weekdayIndex, hours]) => ({
          day_of_week: weekdayIndexToDayOfWeek(weekdayIndex),
          schedule_times: mergeHoursIntoRanges(hours).map((range) => ({
            start_time: formatHourAsTime(range.start),
            end_time: formatHourAsTime(range.end),
          })),
        }),
      );

      const res = await fetch(`${API_BASE}/api/v1/schedule/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ schedules }),
      });
      if (!res.ok) throw new Error(`Failed to save schedule (${res.status})`);

      setIsEditing(false);
    } catch (err) {
      setScheduleError(err.message || "Could not save your schedule.");
    } finally {
      setSaving(false);
    }
  };

  // Add Blocked Schedule
  const handleBlockFieldChange = (field) => (e) => {
    setBlockForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAddBlockedSchedule = async (e) => {
    e.preventDefault();
    setBlockSubmitting(true);
    setBlockError(null);
    setBlockSuccess(false);

    try {
      if (!blockForm.startTime || !blockForm.endTime) {
        throw new Error("Please select both a start and end time.");
      }

      const payload = {
        startTime: `${blockForm.startTime}:00`,
        endTime: `${blockForm.endTime}:00`,
        purpose: "PERSONAL",
        note: blockForm.note || null,
      };

      const res = await fetch(
        `${API_BASE}/api/v1/schedule/add-blocked-schedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error(`Failed to block time (${res.status})`);

      setBlockSuccess(true);
      setBlockForm({ startTime: "", endTime: "", note: "" });
      setTimeout(() => {
        setShowBlockForm(false);
        setBlockSuccess(false);
      }, 1200);
    } catch (err) {
      setBlockError(err.message || "Could not block this time.");
    } finally {
      setBlockSubmitting(false);
    }
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
              <button
                type="button"
                className="block-time-btn"
                onClick={() => setShowBlockForm(true)}
              >
                + Block time
              </button>
            </div>

            {scheduleError && <p className="calendar-error">{scheduleError}</p>}
            {scheduleLoading && (
              <p className="calendar-loading">Loading your schedule…</p>
            )}

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
                disabled={saving}
              >
                {saving ? "SAVING..." : isEditing ? "SAVE" : "EDIT"}
              </button>
            </div>
          </div>
        </section>
      </main>

      {showBlockForm && (
        <div
          className="block-form-overlay"
          onClick={() => setShowBlockForm(false)}
        >
          <form
            className="block-form-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddBlockedSchedule}
          >
            <h3>Block time</h3>
            <p className="block-form-subtitle">
              Mark a period as unavailable for personal reasons.
            </p>

            <label>
              Start
              <input
                type="datetime-local"
                value={blockForm.startTime}
                onChange={handleBlockFieldChange("startTime")}
                required
              />
            </label>

            <label>
              End
              <input
                type="datetime-local"
                value={blockForm.endTime}
                onChange={handleBlockFieldChange("endTime")}
                required
              />
            </label>

            <label>
              Note (optional)
              <textarea
                value={blockForm.note}
                onChange={handleBlockFieldChange("note")}
                rows={3}
                placeholder="e.g. Doctor's appointment"
              />
            </label>

            {blockError && <p className="block-form-error">{blockError}</p>}
            {blockSuccess && (
              <p className="block-form-success">Time blocked successfully.</p>
            )}

            <div className="block-form-actions">
              <button
                type="button"
                className="block-form-cancel"
                onClick={() => setShowBlockForm(false)}
                disabled={blockSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="block-form-submit"
                disabled={blockSubmitting}
              >
                {blockSubmitting ? "Blocking..." : "Block time"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default RCalendar;
