package com.test.backend.dto.expertise;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record PendingExpertiseDTO(
        // Thông tin Expertise (để Admin duyệt)
        @JsonProperty("position_id")
        Long positionId,

        @JsonProperty("position_name")
        String positionName,

        InterviewerExpertiseLevel level,

        @JsonProperty("experience_year")
        Integer experienceYear,

        @JsonProperty("hourly_fee")
        BigDecimal hourlyFee,

        @JsonProperty("cv_url")
        String cvUrl,

        // Thông tin User đính kèm (bị lặp lại nếu có nhiều request)
        @JsonProperty("interviewer_id")
        Long interviewerId,

        @JsonProperty("interviewer_name")
        String interviewerName,

        @JsonProperty("interviewer_mail")
        String interviewerEmail

        ) {}
