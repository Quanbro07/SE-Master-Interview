package com.test.backend.dto.schedule;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

import java.util.List;

@Builder
public record WeeklyFreeScheduleResponse(
        @JsonProperty("schedules")
        List<DailyFreeScheduleDTO> dailySchedules
) {}
