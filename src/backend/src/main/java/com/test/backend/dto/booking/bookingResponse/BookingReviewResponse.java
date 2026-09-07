package com.test.backend.dto.booking.bookingResponse;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@Builder
public record BookingReviewResponse(
        @JsonProperty("review_id")
        Long reviewId,

        @JsonProperty("rating")
        Double rating,

        @JsonProperty("comment")
        String comment
) {}