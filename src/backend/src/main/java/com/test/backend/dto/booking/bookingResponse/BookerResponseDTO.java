package com.test.backend.dto.booking.bookingResponse;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@Builder
public record BookerResponseDTO(
        @JsonProperty("booker_id")
        Long bookerId,

        @JsonProperty("booker_name")
        String bookerName,

        @JsonProperty("booker_email")
        String bookerEmail,

        @JsonProperty("booker_avatar")
        String bookerAvatar
) {
}
