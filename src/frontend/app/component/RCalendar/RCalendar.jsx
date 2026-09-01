"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import UserHeader from "../UserHeader/UserHeader";
import Toast from "../Toast/Toast";
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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 9);
const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const dateKey = (date, hour) => `${format(date, "yyyy-MM-dd")}-${hour}`;
const repeatKey = (weekdayIndex, hour) => `${weekdayIndex}-${hour}`;

const weekdayIndexToDayOfWeek = (weekdayIndex) => weekdayIndex + 2;
const dayOfWeekToWeekdayIndex = (dayOfWeek) => dayOfWeek - 2;

const getAccessToken = () => {
  if (typeof window === "undefined") return "";
  const rawToken =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token") ||
    "";
  // Xóa sạch chữ Bearer và dấu ngoặc kép thừa trong localStorage
  return rawToken
    .replace(/^"+|"+$/g, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
};

const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
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

const parseHourFromTimeString = (value) => {
  if (!value) return null;
  const [hourStr] = value.split(":");
  return parseInt(hourStr, 10);
};

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 1,
  }),
  center: {
    x: "0%",
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 1,
  }),
};

const RCalendar = () => {
  const [user, setUser] = useState(null);
  const [blockForm, setBlockForm] = useState({ note: "" });
  const [blockSelectedSlots, setBlockSelectedSlots] = useState(new Set());
  const isBlockDraggingRef = useRef(false);
  const blockDragValueRef = useRef(true);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [[page, direction], setPage] = useState([0, 0]);
  const [repeatWeekly, setRepeatWeekly] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [repeatSlots, setRepeatSlots] = useState(new Set());
  const [blockedSlots, setBlockedSlots] = useState(new Set());

  const [saving, setSaving] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const isDraggingRef = useRef(false);
  const dragValueRef = useRef(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthLabel = format(weekDays[6], "MMMM yyyy");

  const isSlotInPast = (date, hour) => {
    const slotDate = new Date(date);
    slotDate.setHours(hour, 0, 0, 0);
    return slotDate < new Date();
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error("Lỗi đọc user:", err);
      }
    }
  }, []);

  const loadBlockedSchedules = async (dateInWeek, days) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/schedule/blocked?dateInWeek=${dateInWeek}`,
        { headers: authHeaders() },
      );
      if (!res.ok) return;

      const blocks = await res.json();
      const nextBlockedSlots = new Set();

      if (Array.isArray(blocks)) {
        blocks.forEach((block) => {
          const blockStart = new Date(block.startTime);
          const blockEnd = new Date(block.endTime);

          days.forEach((day) => {
            HOURS.forEach((hour) => {
              const slotStart = new Date(day);
              slotStart.setHours(hour, 0, 0, 0);
              const slotEnd = new Date(slotStart);
              slotEnd.setHours(hour + 1, 0, 0, 0);

              if (slotStart < blockEnd && slotEnd > blockStart) {
                nextBlockedSlots.add(`${format(day, "yyyy-MM-dd")}-${hour}`);
              }
            });
          });
        });
      }

      setBlockedSlots(nextBlockedSlots);
    } catch (err) {
      console.warn("Could not load blocked schedules:", err.message);
    }
  };

  const isBlockSlotSelected = (date, hour) =>
    blockSelectedSlots.has(dateKey(date, hour));

  const setBlockSlot = (date, hour, value) => {
    if (isSlotInPast(date, hour) || isSlotBlocked(date, hour)) return;
    setBlockSelectedSlots((prev) => {
      const next = new Set(prev);
      const key = dateKey(date, hour);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleBlockMouseDown = (date, hour) => {
    if (isSlotInPast(date, hour) || isSlotBlocked(date, hour)) return;
    const nextValue = !isBlockSlotSelected(date, hour);
    blockDragValueRef.current = nextValue;
    isBlockDraggingRef.current = true;
    setBlockSlot(date, hour, nextValue);
  };

  const handleBlockMouseEnter = (date, hour) => {
    if (!isBlockDraggingRef.current) return;
    setBlockSlot(date, hour, blockDragValueRef.current);
  };

  const goPrevWeek = () => {
    if (isEditing) return;
    setPage([page - 1, -1]);
    setWeekStart((prev) => subWeeks(prev, 1));
  };

  const goNextWeek = () => {
    if (isEditing) return;
    setPage([page + 1, 1]);
    setWeekStart((prev) => addWeeks(prev, 1));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    loadScheduleForWeek();
  };

  const isSlotSelected = (date, hour, weekdayIndex) => {
    if (repeatWeekly) {
      return repeatSlots.has(repeatKey(weekdayIndex, hour));
    }
    return selectedSlots.has(dateKey(date, hour));
  };

  const isSlotBlocked = (date, hour) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return blockedSlots.has(`${dateStr}-${hour}`);
  };

  const setSlot = (date, hour, weekdayIndex, value) => {
    if (isSlotInPast(date, hour)) return;

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
    if (!isEditing || isSlotInPast(date, hour) || isSlotBlocked(date, hour))
      return;
    const current = isSlotSelected(date, hour, weekdayIndex);
    const nextValue = !current;
    dragValueRef.current = nextValue;
    isDraggingRef.current = true;
    setSlot(date, hour, weekdayIndex, nextValue);
  };

  const handleMouseEnter = (date, hour, weekdayIndex) => {
    if (
      !isEditing ||
      !isDraggingRef.current ||
      isSlotInPast(date, hour) ||
      isSlotBlocked(date, hour)
    )
      return;
    setSlot(date, hour, weekdayIndex, dragValueRef.current);
  };

  useEffect(() => {
    const stopDragging = () => {
      isDraggingRef.current = false;
      isBlockDraggingRef.current = false;
    };
    window.addEventListener("mouseup", stopDragging);
    return () => window.removeEventListener("mouseup", stopDragging);
  }, []);

  const handleToggleRepeat = () => {
    setRepeatWeekly((prevRepeat) => {
      const willBeRepeat = !prevRepeat;

      if (willBeRepeat) {
        const newRepeatSlots = new Set();
        weekDays.forEach((date, weekdayIndex) => {
          HOURS.forEach((hour) => {
            const dKey = dateKey(date, hour);
            const rKey = repeatKey(weekdayIndex, hour);
            if (selectedSlots.has(dKey)) {
              newRepeatSlots.add(rKey);
            }
          });
        });
        setRepeatSlots(newRepeatSlots);
      } else {
        const newSelectedSlots = new Set();
        weekDays.forEach((date, weekdayIndex) => {
          HOURS.forEach((hour) => {
            const dKey = dateKey(date, hour);
            const rKey = repeatKey(weekdayIndex, hour);
            if (repeatSlots.has(rKey)) {
              newSelectedSlots.add(dKey);
            }
          });
        });
        setSelectedSlots(newSelectedSlots);
      }

      return willBeRepeat;
    });
  };

  const handleEditToggle = () => {
    if (isEditing) {
      handleSaveSchedule();
    } else {
      setIsEditing(true);
    }
  };

  const loadScheduleForWeek = useCallback(async () => {
    try {
      const dateInWeek = format(weekStart, "yyyy-MM-dd");
      const res = await fetch(
        `${API_BASE}/api/v1/schedule/get?dateInWeek=${encodeURIComponent(dateInWeek)}`,
        { method: "GET", headers: authHeaders() },
      );
      if (!res.ok)
        throw new Error(`Failed to load schedule (Status: ${res.status})`);
      const data = await res.json();
      localStorage.setItem("interviewerSchedule", JSON.stringify(data));

      const fetchedRepeatSlots = new Set();
      const fetchedSelectedSlots = new Set();

      (data.schedules || []).forEach((daySchedule) => {
        const weekdayIndex = dayOfWeekToWeekdayIndex(daySchedule.day_of_week);
        if (weekdayIndex < 0 || weekdayIndex > 6) return;
        const targetDate = weekDays[weekdayIndex];

        (daySchedule.schedule_times || []).forEach((range) => {
          const startHour = parseHourFromTimeString(range.start_time);
          const endHour = parseHourFromTimeString(range.end_time);
          if (startHour == null || endHour == null) return;
          for (let h = startHour; h < endHour; h += 1) {
            if (h >= 9 && h <= 22) {
              fetchedRepeatSlots.add(repeatKey(weekdayIndex, h));
              if (targetDate) fetchedSelectedSlots.add(dateKey(targetDate, h));
            }
          }
        });
      });
      setRepeatSlots(fetchedRepeatSlots);
      setSelectedSlots(fetchedSelectedSlots);

      await loadBlockedSchedules(dateInWeek, weekDays);
    } catch (err) {
      console.error("Schedule error:", err);
      showToast(err.message || "Could not load your schedule.", "error");
    }
  }, [weekStart]);

  useEffect(() => {
    loadScheduleForWeek();
  }, [loadScheduleForWeek]);

  const handleSaveSchedule = async () => {
    setSaving(true);

    try {
      const hoursByWeekday = new Map();

      if (repeatWeekly) {
        repeatSlots.forEach((key) => {
          const [weekdayIndexStr, hourStr] = key.split("-");
          const weekdayIndex = parseInt(weekdayIndexStr, 10);
          const hour = parseInt(hourStr, 10);
          if (!hoursByWeekday.has(weekdayIndex)) {
            hoursByWeekday.set(weekdayIndex, []);
          }
          hoursByWeekday.get(weekdayIndex).push(hour);
        });
      } else {
        weekDays.forEach((date, weekdayIndex) => {
          HOURS.forEach((hour) => {
            if (selectedSlots.has(dateKey(date, hour))) {
              if (!hoursByWeekday.has(weekdayIndex)) {
                hoursByWeekday.set(weekdayIndex, []);
              }
              hoursByWeekday.get(weekdayIndex).push(hour);
            }
          });
        });
      }

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
      showToast("Schedule updated successfully!", "success");
    } catch (err) {
      showToast(err.message || "Could not save your schedule.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlockedSchedule = async (e) => {
    e.preventDefault();
    setBlockSubmitting(true);

    try {
      if (blockSelectedSlots.size === 0) {
        throw new Error("Please select at least one time slot to block.");
      }

      const hoursByDate = new Map();
      blockSelectedSlots.forEach((key) => {
        const lastDash = key.lastIndexOf("-");
        const dateStr = key.slice(0, lastDash);
        const hour = parseInt(key.slice(lastDash + 1), 10);
        if (!hoursByDate.has(dateStr)) hoursByDate.set(dateStr, []);
        hoursByDate.get(dateStr).push(hour);
      });

      const requests = [];
      hoursByDate.forEach((hours, dateStr) => {
        mergeHoursIntoRanges(hours).forEach((range) => {
          requests.push({
            start_time: `${dateStr}T${formatHourAsTime(range.start)}`,
            end_time: `${dateStr}T${formatHourAsTime(range.end)}`,
            purpose: "PERSONAL",
            note: blockForm.note || null,
          });
        });
      });

      for (const payload of requests) {
        const res = await fetch(
          `${API_BASE}/api/v1/schedule/add-blocked-schedule`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) throw new Error(`Failed to block time (${res.status})`);
      }

      setBlockSelectedSlots(new Set());
      setBlockForm({ note: "" });
      await loadBlockedSchedules(format(weekStart, "yyyy-MM-dd"), weekDays);

      setShowBlockForm(false);
      showToast("Time blocked successfully!", "success");
    } catch (err) {
      showToast(err.message || "Could not block this time.", "error");
    } finally {
      setBlockSubmitting(false);
    }
  };

  return (
    <div className="r-calendar-root">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <UserHeader user={user} />
      <RNavigationBar />
      <main className="r-calendar-main">
        <section className="r-calendar-inner">
          <h1 className="r-calendar-title">CALENDAR</h1>

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
                onClick={() => {
                  setShowBlockForm(true);
                  setBlockSelectedSlots(new Set());
                }}
              >
                + Block time
              </button>
            </div>

            <div className="r-calendar-nav-row">
              <button
                type="button"
                className="week-nav-btn"
                onClick={goPrevWeek}
                aria-label="Previous week"
                disabled={isEditing}
                title={
                  isEditing ? "Save or cancel your change first!" : undefined
                }
              >
                ‹
              </button>
              <h2 className="month-label">{monthLabel}</h2>
              <button
                type="button"
                className="week-nav-btn"
                onClick={goNextWeek}
                aria-label="Next week"
                disabled={isEditing}
                title={
                  isEditing ? "Save or cancel your change first!" : undefined
                }
              >
                ›
              </button>
            </div>

            <div className="r-calendar-table-wrapper custom-scrollbar">
              <AnimatePresence
                mode="popLayout"
                custom={direction}
                initial={false}
              >
                <motion.div
                  key={page}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                  className="r-calendar-grid"
                >
                  <div className="grid-header-row">
                    <div className="grid-day-col-spacer">DAY</div>
                    {HOURS.map((hour) => (
                      <div key={hour} className="grid-time-header">
                        {hour}:00
                      </div>
                    ))}
                  </div>

                  {weekDays.map((date, weekdayIndex) => {
                    const isFaded = !isSameMonth(date, weekDays[6]);

                    return (
                      <div key={weekdayIndex} className="grid-day-row">
                        <div
                          className={`grid-day-label ${isFaded ? "faded-month" : ""}`}
                        >
                          <span className="weekday-name">
                            {WEEKDAY_LABELS[weekdayIndex]}
                          </span>
                          <span className="weekday-date">
                            {format(date, "d")}
                          </span>
                        </div>

                        {HOURS.map((hour) => {
                          const selected = isSlotSelected(
                            date,
                            hour,
                            weekdayIndex,
                          );
                          const blocked = isSlotBlocked(date, hour);
                          const inPast = isSlotInPast(date, hour);

                          return (
                            <button
                              key={hour}
                              type="button"
                              className={`slot-cell ${selected && !blocked ? "is-selected" : ""} ${blocked ? "is-blocked" : ""} ${!isEditing || inPast ? "is-locked" : ""} ${inPast ? "is-past" : ""}`}
                              onMouseDown={() =>
                                handleMouseDown(date, hour, weekdayIndex)
                              }
                              onMouseEnter={() =>
                                handleMouseEnter(date, hour, weekdayIndex)
                              }
                              aria-pressed={selected && !blocked}
                              aria-label={`${WEEKDAY_LABELS[weekdayIndex]} ${format(date, "MMM d")} ${hour}:00${blocked ? " (blocked)" : ""}`}
                              disabled={blocked || inPast}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="r-calendar-footer">
              {isEditing && (
                <button
                  type="button"
                  className="edit-cancel-btn"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  CANCEL
                </button>
              )}
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
            className="block-form-card block-form-card-grid"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddBlockedSchedule}
          >
            <h3 className="block-form-title">BLOCK TIME</h3>
            <p className="block-form-subtitle">
              Please select your hectic schedule from{" "}
              {format(weekDays[0], "MMM d")} to {format(weekDays[6], "MMM d")}{" "}
              on {format(weekDays[0], "MMMM yyyy")}
            </p>

            <div className="block-form-grid-wrapper custom-scrollbar">
              <div className="r-calendar-grid">
                <div className="grid-header-row">
                  <div className="grid-day-col-spacer">DAY</div>
                  {HOURS.map((hour) => (
                    <div key={hour} className="grid-time-header">
                      {hour}:00
                    </div>
                  ))}
                </div>
                {weekDays.map((date, weekdayIndex) => (
                  <div key={weekdayIndex} className="grid-day-row">
                    <div className="grid-day-label">
                      <span className="weekday-name">
                        {WEEKDAY_LABELS[weekdayIndex]}
                      </span>
                      <span className="weekday-date">{format(date, "d")}</span>
                    </div>
                    {HOURS.map((hour) => {
                      const alreadyBlocked = isSlotBlocked(date, hour);
                      const picked = isBlockSlotSelected(date, hour);
                      const inPast = isSlotInPast(date, hour);
                      return (
                        <button
                          key={hour}
                          type="button"
                          className={`slot-cell block-slot-cell ${picked ? "is-block-picked" : ""} ${alreadyBlocked ? "is-blocked" : ""} ${inPast ? "is-locked is-past" : ""}`}
                          onMouseDown={() => handleBlockMouseDown(date, hour)}
                          onMouseEnter={() => handleBlockMouseEnter(date, hour)}
                          disabled={alreadyBlocked || inPast}
                          aria-pressed={picked}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="block-form-actions">
              <button
                type="button"
                className="block-form-btn block-form-cancel"
                onClick={() => setShowBlockForm(false)}
                disabled={blockSubmitting}
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="block-form-btn block-form-submit"
                disabled={blockSubmitting}
              >
                {blockSubmitting ? "BLOCKING..." : "BLOCK"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default RCalendar;
