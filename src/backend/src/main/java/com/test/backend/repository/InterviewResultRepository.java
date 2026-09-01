package com.test.backend.repository;

import com.test.backend.entity.interviewResult.InterviewResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InterviewResultRepository extends JpaRepository<InterviewResult, Long> {
    
    @Query("SELECT b.interviewResult FROM Booking b WHERE b.bookingId = :bookingId")
Optional<InterviewResult> findByBookingId(@Param("bookingId") Long bookingId);
}