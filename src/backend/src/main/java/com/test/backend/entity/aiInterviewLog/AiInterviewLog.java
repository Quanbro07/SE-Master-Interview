package com.test.backend.entity.aiInterviewLog;

import com.test.backend.entity.aiInterviewSession.AiInterviewSession;
import com.test.backend.entity.question.Question;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "ai_interview_log")
public class AiInterviewLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long logId;

    @Column(name = "role", nullable = false, updatable = false)
    @Enumerated(EnumType.STRING)
    private InterviewLogRole role;

    @Column(name = "content", nullable = false, updatable = false, length = 4096)
    private String content;

    @Column(name = "ai_evaluation", length = 4096)
    private String aiEvaluation;

    @Column(name = "created_at", nullable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    // Relation
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private Question question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private AiInterviewSession aiInterviewSession;
}
