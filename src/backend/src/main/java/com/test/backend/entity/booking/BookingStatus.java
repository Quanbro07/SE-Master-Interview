package com.test.backend.entity.booking;

public enum BookingStatus {
    PENDING, // vừa tạo chớ interviewer duyệt
    ACCEPTED, // interviewer chấp nhận
    REJECTED, // interviewer từ chối
    IN_PROGRESS,
    AWAIT_REVIEW,
    PAID, // đã thanh toán chốt lịch
    CANCELLED, // interviewee hủy
    COMPLETED // Đã phóng vấn xong
}
