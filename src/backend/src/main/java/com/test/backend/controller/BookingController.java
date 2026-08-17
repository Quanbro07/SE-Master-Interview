package com.test.backend.controller;

import com.test.backend.dto.booking.BookingRequest;
import com.test.backend.dto.booking.BookingStatusResponse;
import com.test.backend.dto.booking.ConfirmBookingRequest;
import com.test.backend.dto.booking.bookingResponse.BookingResponse;
import com.test.backend.dto.booking.FilterInterviewerPositionResponse;
import com.test.backend.dto.interview.InterviewResponse;
import com.test.backend.dto.interview.InterviewResultRequest;
import com.test.backend.dto.interview.InterviewerReviewResponse;
import com.test.backend.dto.interview.ReviewInterviewerRequest;
import com.test.backend.entity.booking.BookingStatus;
import com.test.backend.entity.user.CustomUserDetail;
import com.test.backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/booking")
public class BookingController {

    private final BookingService bookingService;

    // Lấy các interviewer theo position
    @GetMapping("/filter-interviewer")
    public ResponseEntity<Page<FilterInterviewerPositionResponse>> filterInterviewerByPosition(
            @RequestParam("position") String position,
            @RequestParam("date") LocalDate date,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<FilterInterviewerPositionResponse>response = bookingService.filterInterviewerByPosition(position, date,  page, size);

        return ResponseEntity.ok(response);
    }

    // Lấy các review của 1 interiviewer
    @GetMapping("interviewer/{interviewerId}/review")
    public ResponseEntity<Page<InterviewerReviewResponse>> getInterviewerReview(
            @RequestParam("page") int page,
            @RequestParam("size") int size,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long interviewerId = userDetail.getUser().getUserId();

        Page<InterviewerReviewResponse> response = bookingService
                .getInterviewerReview(interviewerId, page, size);

        return ResponseEntity.ok(response);
    }

    // Booking Interviewer
    @PreAuthorize("hasRole('Interviewee')")
    @PostMapping("/booking-interviewer")
    public ResponseEntity<BookingResponse> bookingInterviewer(
            @RequestBody BookingRequest request,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long intervieweeId = userDetail.getUser().getUserId();

        BookingResponse response = bookingService.createBooking(intervieweeId, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Xem danh sách booking
    @PreAuthorize("hasAnyRole('Interviewee', 'Interviewer')")
    @GetMapping("/all-bookings")
    public ResponseEntity<List<BookingResponse>> getAllBooking(
            @RequestParam(value = "filter", required = false) BookingStatus status,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long userId = userDetail.getUser().getUserId();

        List<BookingResponse> response = bookingService.getAllBooking(userId, status);

        return ResponseEntity.ok(response);
    }

    // Interviewer confirm booking
    @PreAuthorize("hasRole('Interviewer')")
    @PostMapping("/{bookingId}/confirm")
    public ResponseEntity<BookingStatusResponse> confirmBooking(
            @PathVariable Long bookingId,
            @RequestBody ConfirmBookingRequest request,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long userId = userDetail.getUser().getUserId();

        BookingStatusResponse response = bookingService.confirmBooking(userId, bookingId, request);

        return ResponseEntity.ok(response);
    }

    // Interviewer reject booking
    @PreAuthorize("hasRole('Interviewer')")
    @PostMapping("/{bookingId}/reject")
    public ResponseEntity<BookingStatusResponse> rejectBooking(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long userId = userDetail.getUser().getUserId();

        BookingStatusResponse response = bookingService.rejectBooking(userId, bookingId);

        return ResponseEntity.ok(response);
    }

    // Upload CV cho booking
    @PreAuthorize("hasRole('Interviewee')")
    @PostMapping("/{bookingId}/upload-cv")
    public ResponseEntity<Void> uploadCvBooking(
            @PathVariable Long bookingId,
            @RequestParam("file")MultipartFile file,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long intervieweeId = userDetail.getUser().getUserId();
        bookingService.uploadCvBooking(bookingId, intervieweeId, file);

        return ResponseEntity.ok().build();
    }

    // Tạo link vào cuộc họp
    @PreAuthorize("hasRole('Interviewer')")
    @GetMapping("/{bookingId}/start-url")
    public ResponseEntity<String> getMeetingStartUrl(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long userId = userDetail.getUser().getUserId();

        String response = bookingService.getMeetingStartUrl(bookingId, userId);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/complete")
    public ResponseEntity<InterviewResponse> completeInterview(
            @RequestBody InterviewResultRequest request,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long interviewerId = userDetail.getUser().getUserId();

        bookingService.completeInterview(interviewerId, request);

        // Trả về 200 OK kèm data
        InterviewResponse response = new InterviewResponse(
                "Đã lưu kết quả phỏng vấn. Hệ thống đang xử lý thanh toán.",
                "PROCESSING"
        );

        return ResponseEntity.ok(response);
    }

    public ResponseEntity<Void> reviewInterviewer(
            @RequestBody ReviewInterviewerRequest request,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long bookerId = userDetail.getUser().getUserId();

        bookingService.reviewBooking(bookerId, request);

        return ResponseEntity.ok().build();
    }
}
