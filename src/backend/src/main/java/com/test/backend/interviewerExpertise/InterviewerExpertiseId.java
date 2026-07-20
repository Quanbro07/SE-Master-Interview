package com.test.backend.interviewerExpertise;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.util.Objects;

@Getter
@Setter
@Embeddable
public class InterviewerExpertiseId implements Serializable {
    @Column(name = "interviewer_id")
    private Long interviewerId;

    @Column(name = "position_id")
    private Long positionId;

    // bắt buộc: no-args constructor
    public InterviewerExpertiseId() {}

    public InterviewerExpertiseId(Long interviewerId, Long positionId) {
        this.interviewerId = interviewerId;
        this.positionId = positionId;
    }

    // bắt buộc: equals() và hashCode() dựa trên TẤT CẢ field
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof InterviewerExpertiseId)) return false;
        InterviewerExpertiseId that = (InterviewerExpertiseId) o;
        return Objects.equals(interviewerId, that.interviewerId)
                && Objects.equals(positionId, that.positionId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(interviewerId, positionId);
    }
}
