package com.test.backend.entity.position;

import com.test.backend.entity.positionQuestion.PositionQuestion;
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
@Table(name = "position",
    indexes = {
        @Index(name = "idx_position_name", columnList = "position_name", unique = true)
    }
)
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
