package com.test.backend.entity.question;

import com.test.backend.entity.category.Category;
import com.test.backend.entity.positionQuestion.PositionQuestion;
import com.test.backend.entity.answerKeyword.AnswerKeyword;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.HashSet;
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
    private Set<AnswerKeyword> answerKeywordList = new HashSet<>();


    @Builder.Default
    @OneToMany(mappedBy = "question", fetch = FetchType.LAZY)
    private List<PositionQuestion> positionQuestionList = new ArrayList<>();

    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "question_category",
            joinColumns = @JoinColumn(name = "question_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    private Set<Category> categories = new HashSet<>();

    public void addCategory(Category category) {
        if(this.categories == null) {
            this.categories = new HashSet<>();
        }
        this.categories.add(category);
        category.getQuestions().add(this);
    }

    public void addKeyword(AnswerKeyword answerKeyword) {
        if(this.answerKeywordList == null) {
            this.answerKeywordList = new HashSet<>();
        }
        this.answerKeywordList.add(answerKeyword);
        answerKeyword.setQuestion(this);
    }
}
