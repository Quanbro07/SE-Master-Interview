package com.test.backend.dto.booking;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

public record BookingRequest(
        @JsonProperty("interviewer_id")
        Long interviewerId,

        @JsonProperty("position_name")
        String positionName,

        @JsonProperty("start_date")
        LocalDateTime startDate,

        @JsonProperty("end_date")
        LocalDateTime endDate,

        @JsonProperty(defaultValue = "booking")
        String note
) {}
