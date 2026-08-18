package com.test.backend.repository;

import com.test.backend.entity.user.User;
import com.test.backend.entity.user.interviewer.Interviewer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InterviewerRepository extends JpaRepository<Interviewer, Long> {

    Optional<Interviewer> findByInterviewerId(Long interviewerId);

    Optional<Interviewer> findByStripeAccountId(String stripeAccountId);

    boolean existsByInterviewerId(Long interviewerId);

    @Query("""
        SELECT i
        FROM Interviewer i
        JOIN FETCH i.user
        WHERE i.interviewerId = :interviewerId
        """)
    Optional<Interviewer> findByInterviewerIdFetchUser(
            @Param("interviewerId") Long interviewId);


    @Query("""
        SELECT i
        FROM Interviewer i
        JOIN FETCH i.user u
        WHERE u.email = :email
        """)
    Optional<Interviewer> findByUserEmailFetchUser(
            @Param("email") String email);
}
