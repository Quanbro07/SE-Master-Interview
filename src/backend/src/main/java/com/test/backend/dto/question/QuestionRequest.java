package com.test.backend.dto.question;

import java.util.List;

public record QuestionRequest(
    List<QuestionDTO> questionList
) {}
