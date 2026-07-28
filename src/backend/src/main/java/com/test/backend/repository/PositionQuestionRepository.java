package com.test.backend.repository;

import com.test.backend.entity.positionQuestion.PositionQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PositionQuestionRepository extends JpaRepository<PositionQuestion, Long> {
}
