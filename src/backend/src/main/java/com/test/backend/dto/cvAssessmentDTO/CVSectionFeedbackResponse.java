package com.test.backend.dto.cvAssessmentDTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.test.backend.entity.cvSectionFeedback.CVSection;
import jakarta.persistence.Enumerated;

public record CVSectionFeedbackResponse(
        @JsonProperty("section_name")
        CVSection sectionName,

        @JsonProperty("score")
        Long score,

        @JsonProperty("comment")
        String comment
) {}
