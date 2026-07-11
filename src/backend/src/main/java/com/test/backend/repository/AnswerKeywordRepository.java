package com.test.backend.repository;

import com.test.backend.entity.answerKeyword.AnswerKeyword;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnswerKeywordRepository extends JpaRepository<AnswerKeyword, Long> {
    List<AnswerKeyword> findAllByQuestion_QuestionId(Long questionId);
}
