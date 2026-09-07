package com.test.backend.dto.question;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record QuestionRequest(
    @JsonProperty("questions")
    List<QuestionDTO> questionList
) {}
