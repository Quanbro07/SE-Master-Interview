package com.test.backend.repository;

import com.test.backend.entity.answerKeyword.AnswerKeyword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnswerKeywordRepository extends JpaRepository<AnswerKeyword, Long> {
    List<AnswerKeyword> findAllByQuestion_QuestionId(Long questionId);
}
