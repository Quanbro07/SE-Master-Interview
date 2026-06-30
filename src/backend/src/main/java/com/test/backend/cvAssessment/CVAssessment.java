package com.test.backend.cvAssessment;

import com.test.backend.cvSectionFeedback.CVSectionFeedback;
import com.test.backend.position.Position;
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
@Table(name = "cv_assessment")
public class CVAssessment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assessment_id", nullable = false, updatable = false)
    private Long assessmentId;

    @Column(name = "cv_url", nullable = false, updatable = false, length = 128)
    private String cvUrl;

    @Column(name = "overall_score", nullable = false, updatable = false)
    private Long overallScore; // Thang 100

    @Column(name = "match_score", nullable = false, updatable = false)
    private Long matchScore; // Thang 100

    @Column(name = "match_comment", nullable = false, updatable = false, length = 512)
    private String matchComment;

    @Column(name = "layout_comment", nullable = false, updatable = false, length = 512)
    private String layoutComment;

    @Column(name = "improvement_suggestion", nullable = false, updatable = false, length = 512)
    private String improvementSuggestion;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    // Relation
    @Builder.Default
    @OneToMany(mappedBy = "cvAssessment", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<CVSectionFeedback> cvSectionFeedbackList = new ArrayList<>();

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id", nullable = false)
    private Position position;
}
