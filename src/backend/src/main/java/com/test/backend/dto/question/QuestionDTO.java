package com.test.backend.dto.question;

import java.util.List;

public record QuestionDTO (
        String question,
        String answer,
        List<String> field,
        InsertDifficulty difficulty,
        List<String> keywords
) {}
