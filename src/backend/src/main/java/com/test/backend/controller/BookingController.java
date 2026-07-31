package com.test.backend.controller;

import com.test.backend.dto.booking.BookingRequest;
import com.test.backend.dto.booking.BookingStatusResponse;
import com.test.backend.dto.booking.ConfirmBookingRequest;
import com.test.backend.dto.booking.bookingResponse.BookingResponse;
import com.test.backend.dto.booking.FilterInterviewerPositionResponse;
import com.test.backend.entity.booking.BookingStatus;
import com.test.backend.entity.user.CustomUserDetail;
import com.test.backend.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/booking")
public class BookingController {

    private final BookingService bookingService;

    @GetMapping("/filter-interviewer")
    public ResponseEntity<Page<FilterInterviewerPositionResponse>> filterInterviewerByPosition(
            @RequestParam("position") String position,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<FilterInterviewerPositionResponse>response = bookingService.filterInterviewerByPosition(position, page, size);

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('Interviewee')")
    @PostMapping("/booking-interviewer")
    public ResponseEntity<BookingResponse> bookingInterviewer(
            @RequestBody BookingRequest request,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long intervieweeId = userDetail.getUser().getUserId();

        BookingResponse response = bookingService.createBooking(intervieweeId, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PreAuthorize("hasAnyRole('Interviewee', 'Interviewer')")
    @GetMapping("/all-bookings")
    public ResponseEntity<List<BookingResponse>> getAllBooking(
            @RequestParam(value = "filter", required = false) BookingStatus status,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long userId = userDetail.getUser().getUserId();

        List<BookingResponse> response = bookingService.getAllBooking(userId, status);

        return ResponseEntity.ok(response);
    }

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

    @PreAuthorize("hasRole('Interviewer')")
    @PostMapping("/{bookingId}/reject")
    public ResponseEntity<BookingStatusResponse> rejectBooking(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long userId = userDetail.getUser().getUserId();

        BookingStatusResponse response = bookingService.rejectBooking(userId, bookingId);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{bookingId}/start-url")
    public ResponseEntity<String> getMeetingStartUrl(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long userId = userDetail.getUser().getUserId();

        String response = bookingService.getMeetingStartUrl(bookingId, userId);

        return ResponseEntity.ok(response);
    }

}
