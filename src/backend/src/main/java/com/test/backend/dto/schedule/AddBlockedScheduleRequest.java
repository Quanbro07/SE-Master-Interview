package com.test.backend.dto.schedule;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.test.backend.entity.blockedSchedule.BlockedSchedulePurpose;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record AddBlockedScheduleRequest(
        @NotNull
        @JsonProperty("start_time")
        LocalDateTime startTime,

        @NotNull
        @JsonProperty("end_time")
        LocalDateTime endTime,

        @NotNull
        BlockedSchedulePurpose purpose,

        String note
) {}
