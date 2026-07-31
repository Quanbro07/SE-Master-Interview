package com.test.backend.repository;

import com.test.backend.entity.positionQuestion.PositionQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PositionQuestionRepository extends JpaRepository<PositionQuestion, Long> {
}
