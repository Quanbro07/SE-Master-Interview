package com.test.backend.dto.evaluation;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record EvaluationRequest(
        @JsonProperty("answer_list")
        List<EvaluationDTO> evaluationDTOList
) {}
