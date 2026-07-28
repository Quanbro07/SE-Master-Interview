package com.test.backend.repository;

import com.test.backend.entity.interviewerExpertise.InterviewerExpertise;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InterviewerExpertiseRepository extends JpaRepository<InterviewerExpertise, Long> {

    @EntityGraph(attributePaths = {"interviewer.user", "position"})
    Page<InterviewerExpertise> findAllByIsCertifiedIsFalse(Pageable pageable);

    @EntityGraph(attributePaths = {"interviewer.user", "position"})
    Page<InterviewerExpertise> findAllByPosition_PositionName(String positionPositionName, Pageable pageable);

    Optional<InterviewerExpertise> findById(InterviewerExpertiseId id);
}
