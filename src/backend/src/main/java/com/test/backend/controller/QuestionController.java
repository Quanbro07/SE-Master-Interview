package com.test.backend.controller;

import com.test.backend.dto.evaluation.EvaluationRequest;
import com.test.backend.dto.evaluation.EvaluationResultDTO;
import com.test.backend.dto.question.FilterDifficulty;
import com.test.backend.dto.question.QuestionRequest;
import com.test.backend.dto.question.QuestionResponse;
import com.test.backend.entity.question.Question;
import com.test.backend.service.EvaluationAnswerService;
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

    private final EvaluationAnswerService evaluationAnswerService;

    @PreAuthorize("hasRole('Admin')")
    @PostMapping("/insert-question")
    public ResponseEntity<?> insertQuestion(@RequestBody QuestionRequest request) {
        questionService.insertQuestion(request);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/get-question")
    public ResponseEntity<List<QuestionResponse>> getQuestion(
            @RequestParam String position,
            @RequestParam(required = false) FilterDifficulty difficulty,
            @RequestParam(defaultValue = "10") Integer numQuestions) {

        List<QuestionResponse> response = questionService.getQuestions(position, difficulty, numQuestions);

        return ResponseEntity.ok().body(response);
    }

    @PostMapping("/evaluate-questions")
    public ResponseEntity<List<EvaluationResultDTO>> evaluationQuestions(
            @RequestBody EvaluationRequest request) {

        List<EvaluationResultDTO> response = evaluationAnswerService.evaluateAllAnswers(request);

        return ResponseEntity.ok().body(response);
    }
}
