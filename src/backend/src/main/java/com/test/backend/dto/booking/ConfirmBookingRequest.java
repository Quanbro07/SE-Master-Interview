package com.test.backend.dto.booking;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@Builder
public record ConfirmBookingRequest(
        @JsonProperty(value = "meeting_topic", defaultValue = "Interview")
        String meetingTopic,

        @JsonProperty(value = "meeting_password", defaultValue = "123")
        String meetingPassword
) {}
