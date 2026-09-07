package com.test.backend.repository;

import com.test.backend.entity.interviewerExpertise.InterviewerExpertise;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface InterviewerExpertiseRepository extends JpaRepository<InterviewerExpertise, Long> {

    @EntityGraph(attributePaths = {"interviewer.user", "position"})
    Page<InterviewerExpertise> findAllByIsCertifiedIsFalse(Pageable pageable);

    @EntityGraph(attributePaths = {"interviewer.user"})
    @Query("""
        SELECT ie
        FROM InterviewerExpertise ie
        WHERE LOWER(ie.position.positionName) = LOWER(:positionName)
        ORDER BY
             (ie.interviewer.overallRating * ie.interviewer.totalReviews) / (ie.interviewer.totalReviews + 5.0) DESC
        """)
    Page<InterviewerExpertise> findAllByPositionWithBalancedSort(
            @Param("positionName") String positionPositionName, Pageable pageable);

    Optional<InterviewerExpertise> findById(InterviewerExpertiseId id);

    @Query("""
           SELECT ie
            FROM InterviewerExpertise ie
            JOIN FETCH ie.interviewer iei
            JOIN FETCH iei.user
            JOIN FETCH ie.position iep
            WHERE iei.interviewerId = :interviewerId
            AND LOWER(iep.positionName) = LOWER(:positionName)
        """)
    Optional<InterviewerExpertise> findByInterviewerIdAndPositionNameFetchUserAndPosition(
            @Param("interviewerId") Long interviewerId,
            @Param("positionName") String positionName);

    boolean existsByInterviewer_InterviewerIdAndPosition_PositionId(Long interviewerId, Long positionId);
}
