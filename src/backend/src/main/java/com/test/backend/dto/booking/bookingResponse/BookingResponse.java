package com.test.backend.dto.booking.bookingResponse;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.test.backend.entity.booking.BookingStatus;
import lombok.Builder;

import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Builder
public record BookingResponse(
        @JsonProperty("booking_id")
        Long bookingId,

        @JsonProperty("booker")
        BookerResponseDTO bookerResponseDTO,

        @JsonProperty("interviewer")
        InterviewerResponseDTO interviewerResponseDTO,

        @JsonProperty("booking_status")
        BookingStatus bookingStatus,

        @JsonProperty("meeting_id")
        String meetingId,

        @JsonProperty("meeting_url")
        String meetingUrl,

        @JsonProperty("meeting_password")
        String meetingPassword,

        @JsonProperty("start_time")
        LocalDateTime startTime,

        @JsonProperty("end_time")
        LocalDateTime endTime,

        @JsonProperty("cv_url")
        String cvUrl

) {}
