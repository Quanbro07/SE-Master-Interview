package com.test.backend.dto.schedule.blockedSchedule;

import com.test.backend.entity.blockedSchedule.BlockedSchedulePurpose;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record AddBlockedScheduleRequest(
        @NotNull
        LocalDateTime startTime,
        @NotNull
        LocalDateTime endTime,
        @NotNull
        BlockedSchedulePurpose purpose,

        String note
) {}
