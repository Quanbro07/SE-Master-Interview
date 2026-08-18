package com.test.backend.service;

import com.test.backend.dto.question.FilterDifficulty;
import com.test.backend.dto.question.QuestionDTO;
import com.test.backend.dto.question.QuestionRequest;
import com.test.backend.dto.question.QuestionResponse;
import com.test.backend.entity.answerKeyword.AnswerKeyword;
import com.test.backend.entity.category.Category;
import com.test.backend.entity.position.Position;
import com.test.backend.entity.positionQuestion.PositionQuestion;
import com.test.backend.entity.question.Difficulty;
import com.test.backend.entity.question.Question;
import com.test.backend.repository.PositionQuestionRepository;
import com.test.backend.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class QuestionService {

    private final QuestionRepository questionRepository;

    private final CategoryService categoryService;

    private final AnswerKeywordService answerKeywordService;

    private final PositionService positionService;


    @Transactional
    public void insertQuestion(QuestionRequest request) {

        for(QuestionDTO questionDTO : request.questionList()) {
            // Question
            Question question = buildQuestion(questionDTO.question(),
                    questionDTO.difficulty().toDifficulty(),
                    questionDTO.answer());

            // Category
            // TODO: CHƯA CÓ CATEGORY

            // POSITION

            for(String positionName: questionDTO.field()) {
                positionService.linkQuestion(question, positionName);
            }

            // Answer Keyword

            for(String answerKeywordName: questionDTO.keywords()) {
                AnswerKeyword answerKeyword = answerKeywordService.createAndReturn(answerKeywordName);
                question.addKeyword(answerKeyword);
            }

            questionRepository.save(question);
        }
    }

    public List<QuestionResponse> getQuestions(String position, FilterDifficulty difficulty, Integer numQuestions) {
        boolean isMixed = difficulty == FilterDifficulty.MIXED;

        Difficulty questionDifficulty = difficulty == null ? null : difficulty.toDifficulty();

        List<Question> questionList = questionRepository.findAllByFilter(position, questionDifficulty);

        System.out.println(questionList);

        if(isMixed) {
            Collections.shuffle(questionList);
        }


        List<Question> selectedQuestions = questionList.stream()
                .limit(numQuestions)
                .toList();

        return selectedQuestions.stream()
                .map(this::buildQuestionResponse)
                .toList();
    }

    // Helper Function
    private Question buildQuestion(String content, Difficulty difficulty, String suggestion_answer) {
        Question question = Question.builder()
                .content(content)
                .difficultyLevel(difficulty)
                .suggestionAnswer(suggestion_answer)
                .build();

        return question;
    }

    private QuestionResponse buildQuestionResponse(Question question) {
        return QuestionResponse.builder()
                .questionId(question.getQuestionId())
                .difficulty(question.getDifficultyLevel())
                .content(question.getContent())
                .answer(question.getSuggestionAnswer())
                .categoryList(question.getCategories().stream().map(Category::getCategoryName).toList())
                .build();
    }
}
