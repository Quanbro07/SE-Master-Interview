package com.test.backend.entity.positionQuestion;

import com.test.backend.entity.position.Position;
import com.test.backend.entity.question.Question;
import jakarta.persistence.*;
import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "position_question")
public class PositionQuestion {

    @EmbeddedId
    private PositionQuestionId positionQuestionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("positionId")
    @JoinColumn(name = "position_id", nullable = false)
    private Position position;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("questionId")
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Builder.Default
    @Column(name = "is_required", nullable = false)
    private boolean is_required = false;
}
