package com.test.backend.position;

import com.test.backend.positionQuestion.PositionQuestion;
import com.test.backend.question.Question;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "position")
public class Position {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "position_id", nullable = false, updatable = false, unique = true)
    private Long positionId;

    @Column(name = "position_name", nullable = false, length = 100)
    private String positionName;

    @Builder.Default
    @OneToMany(mappedBy = "position", fetch = FetchType.LAZY)
    private List<PositionQuestion> positionQuestionList = new ArrayList<>();
}
