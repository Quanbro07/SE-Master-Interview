package com.test.backend.entity.interviewer;

import com.test.backend.entity.booking.Booking;
import com.test.backend.entity.user.User;
import com.test.backend.interviewerExpertise.InterviewerExpertise;
import jakarta.persistence.*;
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
    @MapsId // báo cho JPA: PK của Interviewee = PK của User được map ở field này
    @JoinColumn(name = "interviewee_id") // đồng thời là PK và FK -> User.user_id
    private User user;

    @Builder.Default
    @Column(name = "is_stripe_connected")
    private boolean isStripeConnected = false;

    @Column(name = "stripe_id")
    private String stripeAccountId;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "interviewer", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<Booking> inteviewList = new ArrayList<>();

    @OneToMany(mappedBy = "interviewer", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InterviewerExpertise> expertiseList = new ArrayList<>();
}
