package com.test.backend.zoom;

import com.test.backend.dto.booking.ConfirmBookingRequest;
import com.test.backend.dto.zoom.ZoomMeetingDTO;
import com.test.backend.entity.booking.Booking;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@RequiredArgsConstructor
@Service
public class ZoomAsyncService {

    private final ZoomService zoomService;

    private final BookingRepository bookingRepository;

    @Async
    public void generateMeetLink(Long bookingId, ConfirmBookingRequest request, Long durationMins) {

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));

        try {

            ZoomMeetingDTO zoomMeetingDTO = zoomService
                    .createMeeting(
                            request.meetingTopic(),
                            durationMins.intValue(),
                            request.meetingPassword()
                    );

            booking.setMeetingId(zoomMeetingDTO.zoomMeetingId());
            booking.setJoinUrl(zoomMeetingDTO.joinUrl());
            booking.setMeetingPassword(zoomMeetingDTO.meetingPassword());
            bookingRepository.save(booking);
        }
        catch (Exception e) {
            log.error("Failed to generate Google Meet for booking: " + bookingId, e);
            return;
        }
    }
}
