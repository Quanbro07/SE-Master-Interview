package com.test.backend.repository;

import com.test.backend.entity.cvAssessment.CVAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CVAssessmentRepository extends JpaRepository<CVAssessment, Long> {
}
