package com.test.backend.interviewerFeedback;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "inteviewer_feedback")
public class InterviewerFeedback {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "feedback_id", nullable = false, updatable = false)
    private Long feedbackId;

    @Column(name = "technical_score", nullable = false, updatable = false)
    private Long technicalScore; // Thang diem 100

    @Column(name = "communication_score", nullable = false, updatable = false)
    private Long communicationScore; // Thang diem 100

    @Column(name = "preparation_level", nullable = false, updatable = false)
    @Enumerated(EnumType.STRING)
    private PreparationLevel preparationLevel;

    @Column(name = "overall_comment", nullable = false, updatable = false, length = 512)
    private String overallComment;

    @Column(name = "created_at")
    @CreationTimestamp
    private LocalDateTime createdAt;
}
