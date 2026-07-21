package com.test.backend.repository;

import com.test.backend.entity.user.interviewer.Interviewer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InterviewerRepository extends JpaRepository<Interviewer, Long> {
    Optional<Interviewer> findByInterviewerId(Long interviewerId);
}
