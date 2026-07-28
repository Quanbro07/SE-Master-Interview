package com.test.backend.entity.user.interviewee;

import com.test.backend.entity.aiInterviewSession.AiInterviewSession;
import com.test.backend.entity.booking.Booking;
import com.test.backend.entity.cvAssessment.CVAssessment;
import com.test.backend.entity.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.Positive;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "interviewee")
public class Interviewee {

    @Id
    @Column(name = "interviewee_id", nullable = false, updatable = false, unique = true)
    private Long intervieweeId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId // báo cho JPA: PK của Interviewee = PK của User được map ở field này
    @JoinColumn(name = "interviewee_id") // đồng thời là PK và FK -> User.user_id
    private User user;

    @Column(name = "subscription_expired_date")
    private LocalDate subscriptionExpiredDate;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Builder.Default
    @OneToMany(fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "interviewee_id", nullable = false)
    private List<CVAssessment> cvAssessmentList = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "booker", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<Booking> bookingList = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "interviewee", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<AiInterviewSession> aiInterviewSessionList = new ArrayList<>();
}
