package com.test.backend.dto.booking;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.test.backend.dto.schedule.AvailableScheduleDTO;
import com.test.backend.dto.schedule.WeeklyFreeScheduleResponse;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record FilterInterviewerPositionResponse(
    @JsonProperty("interviewer_id")
    Long interviewerId,

    String email,

    @JsonProperty("fullName")
    String fullName,

    @JsonProperty("overall_rating")
    Double overallRating,

    @JsonProperty("available_schedules")
    WeeklyFreeScheduleResponse availableSchedules
) {}
