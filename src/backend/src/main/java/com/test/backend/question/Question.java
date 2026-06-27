package com.test.backend.question;

import com.test.backend.category.Category;
import com.test.backend.position.Position;
import com.test.backend.positionQuestion.PositionQuestion;
import com.test.backend.questionKeyword.QuestionKeyword;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "question")
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "question_id", nullable = false, updatable = false, unique = true)
    private Long questionId;

    @Column(name = "content", nullable = false, length = 500)
    private String content;

    @Column(name = "difficulty_level", nullable = false)
    @Enumerated(EnumType.STRING)
    private Difficulty difficultyLevel;

    @Column(name = "suggestion_answer", nullable = false, length = 2048)
    private String suggestionAnswer;

    // Relation
    @Builder.Default
    @OneToMany(mappedBy = "question", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<QuestionKeyword> questionKeywordList = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "question", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<Category> categoryList = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "question", fetch = FetchType.LAZY)
    private List<PositionQuestion> positionQuestionList = new ArrayList<>();

}
