package com.test.backend.dto.booking;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.test.backend.entity.booking.BookingStatus;
import lombok.Builder;

@Builder
public record BookingStatusResponse(
        @JsonProperty("booking_id")
        Long bookingId,

        @JsonProperty("booking_status")
        BookingStatus bookingStatus
) {}
