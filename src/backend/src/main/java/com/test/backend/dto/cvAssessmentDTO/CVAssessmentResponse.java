package com.test.backend.dto.cvAssessmentDTO;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record CVAssessmentResponse(
    @JsonProperty("cv_url")
    String cvUrl,

    @JsonProperty("overall_score")
    Long overallScore,

    @JsonProperty("match_score")
    Long matchScore,

    @JsonProperty("match_comment")
    String matchComment,

    @JsonProperty("layout_comment")
    String layoutComment,

    @JsonProperty("improvement_suggestion")
    String improvementSuggestion,

    @JsonProperty("section_feedbacks")
    List<CVSectionFeedbackResponse> sectionFeedbackList
){}
