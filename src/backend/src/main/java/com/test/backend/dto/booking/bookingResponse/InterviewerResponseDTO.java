package com.test.backend.dto.booking.bookingResponse;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@Builder
public record InterviewerResponseDTO(
        @JsonProperty("interviewer_id")
        Long interviewerId,

        @JsonProperty("interviewer_name")
        String interviewerName,

        @JsonProperty("interviewer_email")
        String interviewerEmail,

        @JsonProperty("interviewer_avatar")
        String interviewerAvatar
) {}
