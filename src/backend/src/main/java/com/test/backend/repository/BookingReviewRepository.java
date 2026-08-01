package com.test.backend.repository;

import com.test.backend.entity.bookingReview.BookingReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


public interface BookingReviewRepository extends JpaRepository<BookingReview, Long> {
    @Query(
            value = """
            SELECT br
            FROM BookingReview br
            JOIN FETCH br.booking b
            JOIN FETCH b.booker booker
            WHERE b.interviewer.interviewerId = :interviewerId
            ORDER BY br.createdAt DESC
            """,
            countQuery = """
            SELECT count(br)
            FROM BookingReview br
            JOIN br.booking b
            WHERE b.interviewer.interviewerId = :interviewerId
            """
    )
    Page<BookingReview> findByInterviewerIdFetchBooker(
            @Param("interviewerId") Long interviewerId,
            Pageable pageable);
}
