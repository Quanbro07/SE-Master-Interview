package com.test.backend.dto.question;

import com.test.backend.entity.question.Difficulty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

import java.util.List;

@Builder
public record QuestionResponse(
        Long questionId,
        String content,
        Difficulty difficulty,
        List<String> categoryList
) {}
