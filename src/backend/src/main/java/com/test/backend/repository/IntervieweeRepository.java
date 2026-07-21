package com.test.backend.repository;

import com.test.backend.entity.user.interviewee.Interviewee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IntervieweeRepository extends JpaRepository<Interviewee, Long> {
    Optional<Interviewee> findByIntervieweeId(Long intervieweeId);
}
