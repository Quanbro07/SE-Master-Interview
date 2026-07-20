package com.test.backend.service;

import com.test.backend.entity.answerKeyword.AnswerKeyword;
import com.test.backend.repository.AnswerKeywordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@RequiredArgsConstructor
@Service
public class AnswerKeywordService {
    private final AnswerKeywordRepository answerKeywordRepository;

    public AnswerKeyword createAndReturn(String keyword) {
        return createAndReturn(keyword, BigDecimal.valueOf(1));
    }


    public AnswerKeyword createAndReturn(String keyword, BigDecimal weight) {
        AnswerKeyword answerKeyword = AnswerKeyword.builder()
                .keyword(keyword)
                .weight(weight)
                .build();


        return answerKeyword;
    }


}
