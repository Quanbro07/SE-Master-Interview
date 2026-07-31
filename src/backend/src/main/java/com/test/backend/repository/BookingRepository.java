package com.test.backend.repository;

import com.test.backend.entity.booking.Booking;
import com.test.backend.entity.booking.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    @Query("""
        SELECT b
        FROM Booking b
        JOIN FETCH b.interviewer i
        JOIN FETCH i.user
        JOIN FETCH b.booker bo
        JOIN FETCH bo.user
        WHERE 
                (i.interviewerId = :userId OR
                bo.intervieweeId =:userId) 
                AND
                (:bookingStatus IS NULL OR
                b.status = :bookingStatus)
        """)
    List<Booking> findAllByUserIdAndStatusFilterFetchUser(
            @Param("userId") Long userId,
            @Param("bookingStatus")BookingStatus bookingStatus);

    @Query("""
        SELECT b
        FROM Booking b
        JOIN FETCH b.interviewer
        WHERE b.bookingId = :bookingId
        """)
    Optional<Booking> findByBookingIdFetchInterviewer(@Param("bookingId") Long bookingId);

    Optional<Booking> findByBookingIdAndInterviewer_InterviewerId(Long bookingId, Long interviewerId);
}
