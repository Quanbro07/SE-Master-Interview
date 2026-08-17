package com.test.backend.repository;

import com.test.backend.entity.booking.Booking;
import com.test.backend.entity.booking.BookingStatus;
import org.hibernate.query.Page;
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

    @Query("""
        SELECT b
        FROM Booking b
        JOIN FETCH b.interviewer
        JOIN FETCH b.booker
        WHERE b.bookingId = :bookingId
        """)
    Optional<Booking> findByBookingIdFetchInterviewerAndBooker(@Param("bookingId") Long bookingId);

    @Query("""
        SELECT b
        FROM Booking b
        JOIN FETCH b.paymentList
        WHERE b.paymentIntentId = :paymentIntentId
        """)
    Optional<Booking> findByPaymentIntentIdFetchPayment(@Param("paymentIntentId") String paymentIntentId);

    Optional<Booking> findByPaymentIntentId(String paymentIntentId);

    Optional<Booking> findByBookingId(Long bookingId);

    @Query("""
        SELECT b
        FROM Booking b
        JOIN FETCH b.booker
        WHERE b.bookingId = :bookingId
        """)
    Optional<Booking> findByBookingIdFetchBooker(@Param("bookingId") Long bookingId);

    Optional<Booking> findByMeetingId(String meetingId);

    @Query("""
        SELECT b 
        FROM Booking b
        LEFT JOIN FETCH b.paymentList
        JOIN FETCH b.booker bo
        JOIN FETCH bo.user
        JOIN FETCH b.interviewer bi
        JOIN FETCH bi.user
        WHERE b.paymentIntentId = :intentId
    """)
    Optional<Booking> findByPaymentIntentIdFetchAll(@Param("intentId") String intentId);
}
