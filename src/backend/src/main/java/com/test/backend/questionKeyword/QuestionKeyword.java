package com.test.backend.questionKeyword;

import com.test.backend.question.Question;
import jakarta.persistence.*;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "question_keyword")
public class QuestionKeyword {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "keyword_id", nullable = false, updatable = false, unique = true)
    private Long keywordId;

    @Column(name = "keyword", nullable = false, length = 50)
    private String keyword;

    @Column(name = "weight", nullable = false, precision = 4, scale = 2)
    @Positive
    private BigDecimal weight;

    // Relation
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;
}
