package com.test.backend.dto.schedule;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record ScheduleDTO(
        @JsonProperty("day_of_week")
        short dayOfWeek,

        @JsonProperty("schedule_times")
        List<ScheduleTimeDTO> scheduleTimeDTOList
) {
}
