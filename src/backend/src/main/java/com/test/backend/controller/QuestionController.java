package com.test.backend.controller;

import com.test.backend.dto.question.FilterDifficulty;
import com.test.backend.dto.question.QuestionRequest;
import com.test.backend.entity.question.Question;
import com.test.backend.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1/question")
public class QuestionController {

    private final QuestionService questionService;

    @PreAuthorize("hasRole('Admin')")
    @PostMapping("/insert-question")
    public ResponseEntity<?> insertQuestion(@RequestBody QuestionRequest request) {
        questionService.insertQuestion(request);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/question")
    public ResponseEntity<?> getQuestion(
            @RequestParam String position,
            @RequestParam(required = false) FilterDifficulty difficulty,
            @RequestParam(defaultValue = "10") Integer numQuestions) {

        List<Question> response = questionService.getQuestions(position, difficulty, numQuestions);

        return ResponseEntity.ok().body(response);
    }
}
