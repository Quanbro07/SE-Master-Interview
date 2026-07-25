package com.test.backend.dto.schedule;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record ScheduleRequest(
        @JsonProperty("day_of_week")
        short dayOfWeek,

        @JsonProperty("schedule_times")
        List<ScheduleTimeRequest> scheduleTimeRequestList
) {
}
