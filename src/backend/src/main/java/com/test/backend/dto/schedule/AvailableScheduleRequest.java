package com.test.backend.dto.schedule;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AvailableScheduleRequest(
        @JsonProperty("schedules")
        List<ScheduleRequest> scheduleRequestList
) {}
