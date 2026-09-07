"use client";
import React, { useState, useEffect } from "react";
import { format, getDay } from "date-fns";
import "./BookingModal.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const BookingModal = ({ mentor, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Helper chuyển đổi dayOfWeek: JS Date (0=Sun, 1=Mon...6=Sat) -> DB short (2=Mon...8=Sun)
  const getDbDayOfWeek = (date) => {
    const day = getDay(date);
    return day === 0 ? 8 : day + 1; // Chủ nhật là 8, Thứ hai là 2[cite: 40, 45]
  };

  // Lấy lịch rảnh khi chuyển đổi selectedDate hoặc mentor
  useEffect(() => {
    if (!mentor?.id) return;

    const fetchInterviewerSchedule = async () => {
      setLoadingSchedule(true);
      setSelectedSlot(null);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");

        // Gọi API lấy schedule theo ngày truyền vào[cite: 40, 44]
        const res = await fetch(
          `${API_BASE}/api/v1/schedule/get?dateInWeek=${dateStr}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
            },
          },
        );

        if (!res.ok) throw new Error("Failed to fetch schedule");

        const data = await res.json();
        const targetDayOfWeek = getDbDayOfWeek(selectedDate);

        // 1. Lọc khung giờ đăng ký rảnh của thứ đang chọn
        const daySchedule = (data.schedules || []).find(
          (s) => s.day_of_week === targetDayOfWeek,
        );

        let validSlots = [];

        if (daySchedule && daySchedule.schedule_times) {
          // Tách các khoảng giờ (range) thành các slot 1 tiếng
          daySchedule.schedule_times.forEach((range) => {
            const startH = parseInt(range.start_time.split(":")[0], 10);
            const endH = parseInt(range.end_time.split(":")[0], 10);

            for (let h = startH; h < endH; h++) {
              const slotStartStr = `${String(h).padStart(2, "0")}:00`;
              const slotEndStr = `${String(h + 1).padStart(2, "0")}:00`;
              validSlots.push({
                display: `${slotStartStr}-${slotEndStr}`,
                startHour: h,
                startTime: `${dateStr}T${slotStartStr}:00`,
                endTime: `${dateStr}T${slotEndStr}:00`,
              });
            }
          });
        }

        // 2. Lọc bỏ các slot vướng vào blockedSchedules[cite: 40, 46]
        const blockedList = data.blockedSchedules || [];
        const finalAvailableSlots = validSlots.filter((slot) => {
          const slotStart = new Date(
            `${dateStr}T${String(slot.startHour).padStart(2, "0")}:00:00`,
          );
          const slotEnd = new Date(
            `${dateStr}T${String(slot.startHour + 1).padStart(2, "0")}:00:00`,
          );

          // Kiểm tra xem slot có nằm trong khoảng blocked time nào không
          const isBlocked = blockedList.some((b) => {
            const bStart = new Date(b.startTime);
            const bEnd = new Date(b.endTime);
            return slotStart < bEnd && slotEnd > bStart;
          });

          return !isBlocked;
        });

        setAvailableSlots(finalAvailableSlots);
      } catch (err) {
        console.error("Error loading interviewer schedule:", err);
        setAvailableSlots([]);
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchInterviewerSchedule();
  }, [selectedDate, mentor]);

  return (
    <div className="booking-modal-overlay">
      <div className="booking-modal-card">
        <h3>Book Interview with {mentor?.name}</h3>

        <div className="booking-modal-content">
          {/* CỘT TRÁI: LỊCH CHỌN NGÀY VÀ SLOTS TIME */}
          <div className="booking-modal-left">
            {/* Component Calendar/DatePicker chọn ngày (cập nhật selectedDate) */}
            {/* <Calendar onChange={setSelectedDate} value={selectedDate} /> */}

            <div className="available-time-section">
              <div className="available-time-title">Available time</div>

              {/* VÙNG HIỂN THỊ TIME SLOTS VỚI KHUNG CỐ ĐỊNH CHIỀU CAO */}
              <div className="available-time-grid custom-scrollbar">
                {loadingSchedule ? (
                  <div className="no-slots-message">Loading schedules...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="no-slots-message">
                    No available slots for this date
                  </div>
                ) : (
                  availableSlots.map((slot, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`time-slot-btn ${
                        selectedSlot?.display === slot.display ? "selected" : ""
                      }`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot.display}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: CHI TIẾT BOOKING & UPLOAD CV */}
          <div className="booking-modal-right">
            {/* Thông tin Booking Details, Upload CV, Payment */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
