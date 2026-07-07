package com.test.backend.service;

import com.test.backend.dto.question.FilterDifficulty;
import com.test.backend.dto.question.QuestionRequest;
import com.test.backend.entity.question.Difficulty;
import com.test.backend.entity.question.Question;
import com.test.backend.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class QuestionService {

    private final QuestionRepository questionRepository;

    public void insertQuestion(QuestionRequest request) {


    }

    public List<Question> getQuestions(String position, FilterDifficulty difficulty, Integer numQuestions) {
        boolean isMixed = difficulty == FilterDifficulty.MIXED;

        Difficulty questionDifficulty = difficulty == null ? null : difficulty.toDifficulty();

        List<Question> questionList = questionRepository.findAllByFilter(position, questionDifficulty);

        if(isMixed) {
            Collections.shuffle(questionList);
        }


        List<Question> selectedQuestions = questionList.stream()
                .limit(numQuestions)
                .toList();

        return selectedQuestions;
    }
}
