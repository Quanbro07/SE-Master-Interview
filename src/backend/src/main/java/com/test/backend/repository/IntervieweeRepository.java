package com.test.backend.repository;

import com.test.backend.entity.user.interviewee.Interviewee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IntervieweeRepository extends JpaRepository<Interviewee, Long> {
    Optional<Interviewee> findByIntervieweeId(Long intervieweeId);

    @Query("""
        SELECT i
        FROM Interviewee i
        JOIN FETCH i.user
        WHERE i.intervieweeId = :intervieweeId
        """)
    Optional<Interviewee> findByIntervieweeIdFetchUser(@Param("intervieweeId") Long intervieweeId);
}
