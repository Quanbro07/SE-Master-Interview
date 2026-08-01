package com.test.backend.dto.booking;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record FilterInterviewerPositionResponse(
    @JsonProperty("interviewer_id")
    Long interviewerId,

    String email,

    @JsonProperty("user_name")
    String userName,

    @JsonProperty("fullName")
    String fullName,

    @JsonProperty("linkedin_url")
    String linkedinUrl,

    @JsonProperty("github_url")
    String githubUrl,

    InterviewerExpertiseLevel level,

    @JsonProperty("experience_year")
    Integer experienceYear,

    @JsonProperty("hourly_fee")
    BigDecimal hourlyFee,

    @JsonProperty("overall_rating")
    Double overallRating,

    @JsonProperty("total_review")
    Integer totalReview

) {}
