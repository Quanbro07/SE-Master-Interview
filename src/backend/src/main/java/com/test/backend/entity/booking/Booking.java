package com.test.backend.entity.booking;

import com.test.backend.entity.bookingReview.BookingReview;
import com.test.backend.entity.interviewResult.InterviewResult;
import com.test.backend.entity.payment.Payment;
import com.test.backend.entity.user.interviewee.Interviewee;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.entity.position.Position;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "booking")
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booking_id", nullable = false, updatable = false)
    private Long bookingId;

    @Column(name = "start_time", nullable = false, updatable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false, updatable = false)
    private LocalDateTime endTime;

    @Column(name = "cv_url")
    private String cvUrl;

    @Column(name = "meeting_id")
    private String meetingId;

    @Column(name = "join_url", length = 2048)
    private String joinUrl;

    @Column(name = "start_url", length = 2048)
    private String startUrl;

    @Column(name = "meeting_password")
    private String meetingPassword;

    @Builder.Default
    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private BookingStatus status = BookingStatus.PENDING;

    @Column(name = "total_amount", precision = 10, scale = 2, nullable = false, updatable = false)
    private BigDecimal totalAmount;

    @Column(name = "payment_intent")
    private String paymentIntentId;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @CreationTimestamp
    private LocalDateTime updatedAt;

    // Relation
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_result_id", referencedColumnName = "result_id")
    private InterviewResult interviewResult;

    @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL)
    private BookingReview bookingReview;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id")
    private Position position;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interviewer_id", nullable = false, updatable = false)
    private Interviewer interviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booker_id", nullable = false, updatable = false)
    private Interviewee booker;

    @OneToMany(mappedBy = "booking", fetch = FetchType.LAZY)
    private List<Payment> paymentList;

    @PrePersist
    @PreUpdate
    private void validateTimeBeforeSave() {
        if (startTime != null && endTime != null && !startTime.isBefore(endTime)) {
            throw new IllegalArgumentException("Error - Booking!" +
                    " startTime must be before endTime");
        }
    }
}
