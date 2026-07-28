package com.test.backend.dto.expertise;

import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
import lombok.Builder;

@Builder
public record PendingExpertiseDTO(
        // Thông tin Expertise (để Admin duyệt)
        Long positionId,
        String positionName,
        InterviewerExpertiseLevel level,
        Integer experienceYear,
        String cvUrl,

        // Thông tin User đính kèm (bị lặp lại nếu có nhiều request)
        Long interviewerId,
        String interviewerName,
        String interviewerEmail

        ) {}
