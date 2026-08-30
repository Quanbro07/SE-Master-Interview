package com.test.backend.dto.interview;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.test.backend.entity.interviewResult.PreparationLevel;
import lombok.Builder;

@Builder
public record InterviewResultResponse(
        @JsonProperty("result_id")
        Long resultId,

        @JsonProperty("technical_score")
        Long technicalScore,

        @JsonProperty("communication_score")
        Long communicationScore,

        @JsonProperty("preparation_level")
        PreparationLevel preparationLevel,

        @JsonProperty("overall_comment")
        String overallComment
) {
}