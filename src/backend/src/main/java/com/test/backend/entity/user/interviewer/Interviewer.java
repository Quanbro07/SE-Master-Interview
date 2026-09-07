package com.test.backend.entity.user.interviewer;

import com.test.backend.entity.booking.Booking;
import com.test.backend.entity.user.User;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertise;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Positive;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "interviewer")
public class Interviewer {
    @Id
    @Column(name = "interviewer_id", nullable = false, updatable = false, unique = true)
    private Long interviewerId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId // báo cho JPA: PK của Interviewer = PK của User được map ở field này
    @JoinColumn(name = "interviewer_id") // đồng thời là PK và FK -> User.user_id
    private User user;

    @Builder.Default
    @Column(name = "is_stripe_connected")
    private Boolean isStripeConnected = Boolean.FALSE;

    @Column(name = "stripe_id")
    private String stripeAccountId;

    @Builder.Default
    @DecimalMin(value = "0.0", message = "Rating nhỏ nhất là 0")
    @DecimalMax(value = "5.0", message = "Rating lớn nhất là 5")
    @Column(name = "overall_rating")
    private Double overallRating = 0.0;

    @Builder.Default
    @Column(name = "total_reviews")
    private Integer totalReviews = 0;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;


    @Builder.Default
    @OneToMany(mappedBy = "interviewer", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<Booking> inteviewList = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "interviewer", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InterviewerExpertise> expertiseList = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "interviewer", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<Booking> bookingList = new ArrayList<>();

    // Helper

}
