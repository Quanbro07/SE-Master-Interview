package com.test.backend.dto.booking;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;

public record FilterPositionResponse(
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
    Integer experienceYear
) {}
