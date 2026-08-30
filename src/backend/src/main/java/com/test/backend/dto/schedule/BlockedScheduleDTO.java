package com.test.backend.dto.schedule;

import com.test.backend.entity.blockedSchedule.BlockedSchedulePurpose;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record BlockedScheduleDTO(
        Long blockedScheduleId,
        LocalDateTime startTime,
        LocalDateTime endTime,
        BlockedSchedulePurpose purpose,
        String note
) {}