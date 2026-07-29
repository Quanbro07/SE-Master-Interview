package com.test.backend.entity.booking;

import com.test.backend.entity.bookingReview.BookingReview;
import com.test.backend.entity.interviewResult.InterviewResult;
import com.test.backend.entity.user.interviewee.Interviewee;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.entity.position.Position;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

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

    @Column(name = "booking_date", nullable = false, updatable = false)
    private LocalDate bookingDate;

    @Column(name = "start_time", nullable = false, updatable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false, updatable = false)
    private LocalTime endTime;

    @Column(name = "cv_url", nullable = false, updatable = false)
    private String cvUrl;

    @Column(name = "meeting_id", nullable = false, updatable = false)
    private String meetingId;

    @Column(name = "join_url", nullable = false, updatable = false)
    private String joinUrl;

    @Column(name = "start_url", nullable = false, updatable = false)
    private String startUrl;

    @Column(name = "meeting_password")
    private String meetingPassword;

    @Column(name = "status", nullable = false, updatable = false)
    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    // Relation
    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "booking_id", nullable = false, updatable = false)
    private InterviewResult interviewResult;

    @Builder.Default
    @OneToMany(mappedBy = "booking", fetch = FetchType.LAZY)
    private List<BookingReview> bookingReviewList = new ArrayList<>();

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id")
    private Position position;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interviewer_id", nullable = false, updatable = false)
    private Interviewer interviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booker_id", nullable = false, updatable = false)
    private Interviewee booker;

    @PrePersist
    @PreUpdate
    private void validateTimeBeforeSave() {
        if (startTime != null && endTime != null && !startTime.isBefore(endTime)) {
            throw new IllegalArgumentException("Error - Booking!" +
                    " startTime must be before endTime");
        }
    }
}
