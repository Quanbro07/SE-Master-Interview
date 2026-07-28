package com.test.backend.dto.schedule;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalTime;

public record ScheduleTimeDTO(
        @JsonProperty("start_time")
        LocalTime startTime,

        @JsonProperty("end_time")
        LocalTime endTime
) {
}
