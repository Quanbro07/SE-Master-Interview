"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback } from "react";
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

// Thời gian từ 9h đến 22h (mỗi bước 1h)
const HOURS = Array.from({ length: 14 }, (_, i) => i + 9); // 9 -> 22
const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const dateKey = (date, hour) => `${format(date, "yyyy-MM-dd")}-${hour}`;
const repeatKey = (weekdayIndex, hour) => `${weekdayIndex}-${hour}`;

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

const parseHourFromTimeString = (value) => {
  if (!value) return null;
  const [hourStr] = value.split(":");
  return parseInt(hourStr, 10);
};

// Variants cho Animation chuyển tuần
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

  const [scheduleError, setScheduleError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockError, setBlockError] = useState(null);
  const [blockSuccess, setBlockSuccess] = useState(false);

  const isDraggingRef = useRef(false);
  const dragValueRef = useRef(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthLabel = format(weekDays[6], "MMMM yyyy");

  // Helper kiểm tra mốc thời gian (Ngày + Giờ) có thuộc về quá khứ hay không
  const isSlotInPast = (date, hour) => {
    const slotDate = new Date(date);
    slotDate.setHours(hour, 0, 0, 0);
    return slotDate < new Date();
  };

  const loadBlockedSchedules = async (dateInWeek, days) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/schedule/get?dateInWeek=${dateInWeek}`,
        { headers: authHeaders() },
      );
      if (!res.ok) return;

      const data = await res.json();
      const nextBlockedSlots = new Set();

      if (data.blockedSchedules && Array.isArray(data.blockedSchedules)) {
        data.blockedSchedules.forEach((block) => {
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
    if (!isEditing || isSlotInPast(date, hour)) return;
    const current = isSlotSelected(date, hour, weekdayIndex);
    const nextValue = !current;
    dragValueRef.current = nextValue;
    isDraggingRef.current = true;
    setSlot(date, hour, weekdayIndex, nextValue);
  };

  const handleMouseEnter = (date, hour, weekdayIndex) => {
    if (!isEditing || !isDraggingRef.current || isSlotInPast(date, hour))
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

  // Xử lý Bật/Tắt Repeat Weekly
  const handleToggleRepeat = () => {
    setRepeatWeekly((prevRepeat) => {
      const willBeRepeat = !prevRepeat;

      if (willBeRepeat) {
        // Tắt -> Bật: Gom các slot đang được chọn ở tuần hiện tại thành Lịch lặp chung
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
        // Bật -> Tắt: Nhân bản Lịch lặp chung vào các ô ngày cụ thể của tuần hiện tại
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

  // Tải lại dữ liệu khi đổi tuần
  const loadScheduleForWeek = useCallback(async () => {
    setScheduleError(null);
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
      setScheduleError(err.message || "Could not load your schedule.");
    }
  }, [weekStart]);

  useEffect(() => {
    loadScheduleForWeek();
  }, [loadScheduleForWeek]);

  // Lưu dữ liệu lịch
  const handleSaveSchedule = async () => {
    setSaving(true);
    setScheduleError(null);

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
    } catch (err) {
      setScheduleError(err.message || "Could not save your schedule.");
    } finally {
      setSaving(false);
    }
  };

  const handleBlockFieldChange = (field) => (e) => {
    setBlockForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAddBlockedSchedule = async (e) => {
    e.preventDefault();
    setBlockSubmitting(true);
    setBlockError(null);
    setBlockSuccess(false);

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
      setBlockSuccess(true);
      setBlockSelectedSlots(new Set());
      setBlockForm({ note: "" });
      await loadBlockedSchedules(format(weekStart, "yyyy-MM-dd"), weekDays);

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
                  setBlockError(null);
                }}
              >
                + Block time
              </button>
            </div>

            {scheduleError && <p className="calendar-error">{scheduleError}</p>}

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
                isabled={isEditing}
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
                              className={`slot-cell ${selected ? "is-selected" : ""} ${blocked ? "is-blocked" : ""} ${!isEditing || inPast ? "is-locked" : ""} ${inPast ? "is-past" : ""}`}
                              onMouseDown={() =>
                                handleMouseDown(date, hour, weekdayIndex)
                              }
                              onMouseEnter={() =>
                                handleMouseEnter(date, hour, weekdayIndex)
                              }
                              aria-pressed={selected}
                              aria-label={`${WEEKDAY_LABELS[weekdayIndex]} ${format(date, "MMM d")} ${hour}:00${blocked ? " (blocked)" : ""}`}
                              disabled={blocked || inPast}
                              style={{
                                cursor: inPast ? "not-allowed" : "pointer",
                                opacity: inPast ? 0.35 : 1,
                              }}
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
            <h3>Block time</h3>
            <p className="block-form-subtitle">
              Chọn các khung giờ muốn đánh dấu bận cho tuần {monthLabel}.
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

            <label>
              Note (optional)
              <textarea
                value={blockForm.note}
                onChange={handleBlockFieldChange("note")}
                rows={2}
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
                {blockSubmitting
                  ? "Blocking..."
                  : `Block ${blockSelectedSlots.size || ""} slot(s)`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default RCalendar;
