package com.test.backend.positionQuestion;

import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
@Getter
@Setter
public class PositionQuestionId implements Serializable {

    private Long positionId;

    private Long questionId;

    // constructor
    public PositionQuestionId() {}

    public PositionQuestionId(Long positionId, Long questionId) {
        this.positionId = positionId;
        this.questionId = questionId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PositionQuestionId that = (PositionQuestionId) o;
        return Objects.equals(positionId, that.positionId) &&
                Objects.equals(questionId, that.questionId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(positionId, questionId);
    }

}
