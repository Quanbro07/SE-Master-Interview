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

    @EntityGraph(attributePaths = {"interviewer.user", "position"})
    @Query("""
        SELECT ie
        FROM InterviewerExpertise ie
        WHERE ie.position.positionName = :positionName
        ORDER BY
             (ie.interviewer.overallRating * ie.interviewer.totalReviews) / (ie.interviewer.totalReviews + 5.0) DESC
        """)
    Page<InterviewerExpertise> findAllByPositionWithBalancedSort(
            @Param("positionName") String positionPositionName, Pageable pageable);

    Optional<InterviewerExpertise> findById(InterviewerExpertiseId id);
}
