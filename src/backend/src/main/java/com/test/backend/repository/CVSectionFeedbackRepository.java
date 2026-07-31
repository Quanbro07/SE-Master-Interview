package com.test.backend.repository;

import com.test.backend.entity.cvSectionFeedback.CVSectionFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CVSectionFeedbackRepository extends JpaRepository<CVSectionFeedback, Long> {
}
