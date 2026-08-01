package com.test.backend.dto.interview;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public record ReviewInterviewerRequest(
        @JsonProperty("booking_id")
        Long bookingId,

        Double rate,

        String comment
) {
}
