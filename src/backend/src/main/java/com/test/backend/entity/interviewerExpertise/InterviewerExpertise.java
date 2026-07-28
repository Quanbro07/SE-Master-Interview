package com.test.backend.entity.interviewerExpertise;

import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.entity.position.Position;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "interviewer_expertise")
public class InterviewerExpertise {

    @EmbeddedId
    private InterviewerExpertiseId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("interviewerId") // map field "interviewerId" trong Embeddable với quan hệ này
    @JoinColumn(name = "interviewer_id")
    private Interviewer interviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("positionId") // map field "positionId" trong Embeddable với quan hệ này
    @JoinColumn(name = "position_id")
    private Position position;

    @Enumerated(EnumType.STRING)
    @Column(name = "level")
    private InterviewerExpertiseLevel level;

    @Column(name = "experience_year")
    private Integer experienceYear;

    @Builder.Default
    @Column(name = "isCertified")
    private Boolean isCertified = Boolean.FALSE;

    @Column(name = "cv_url", length = 2048)
    private String cvUrl;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
