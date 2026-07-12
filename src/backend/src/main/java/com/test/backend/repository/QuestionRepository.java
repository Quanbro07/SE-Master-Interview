package com.test.backend.repository;

import com.test.backend.entity.question.Difficulty;
import com.test.backend.entity.question.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
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
