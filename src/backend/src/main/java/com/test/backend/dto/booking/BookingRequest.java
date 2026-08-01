package com.test.backend.dto.booking;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

public record BookingRequest(
        @JsonProperty("interviewer_id")
        Long interviewerId,

        @JsonProperty("position_name")
        String positionName,

        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
        @JsonProperty("start_date")
        LocalDateTime startDate,

        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
        @JsonProperty("end_date")
        LocalDateTime endDate,

        @JsonProperty(defaultValue = "booking")
        String note
) {}
