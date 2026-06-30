package com.test.backend.aiInterviewSession;

import com.test.backend.aiInterviewLog.AiInterviewLog;
import com.test.backend.position.Position;
import com.test.backend.user.User;
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
@Table(name = "ai_interview_session")
public class AiInterviewSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id", nullable = false, updatable = false)
    private Long sessionId;

    @Column(name = "cv_url", length = 512)
    private String cvUrl;

    @Column(name = "overall_score", nullable = false)
    private Long overallScore; // Trên thang điểm 100

    @Column(name = "overall_feedback", nullable = false, length = 1024)
    private String overallFeedback;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    // Relation
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "position_id", nullable = false)
    private Position position;

    @Builder.Default
    @OneToMany(mappedBy = "aiInterviewSession", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<AiInterviewLog> aiInterviewLogList = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
