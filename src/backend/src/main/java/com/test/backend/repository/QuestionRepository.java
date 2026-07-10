package com.test.backend.repository;

import com.test.backend.entity.question.Difficulty;
import com.test.backend.entity.question.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    @Query("""
            SELECT pq.question
            FROM PositionQuestion pq
            WHERE pq.position.positionName = :position
             AND (:difficulty IS NULL
                       OR pq.question.difficultyLevel = :difficulty)
        """)
    List<Question> findAllByFilter(
            @Param("position") String position,
            @Param("difficulty")Difficulty difficulty);
}
