package com.test.backend.interviewerExpertise;

import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.entity.position.Position;
import jakarta.persistence.*;
import lombok.*;

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

    @Column(name = "level")
    private String level;

    @Column(name = "experience_year")
    private Integer experienceYear;
}
