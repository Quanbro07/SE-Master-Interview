package com.test.backend.cvSectionFeedback;

import com.test.backend.cvAssessment.CVAssessment;
import jakarta.persistence.*;
import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "cv_section_feedback")
public class CVSectionFeedback {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "feedback_id", nullable = false, updatable = false)
    private Long feedbackId;

    @Column(name = "section_name", nullable = false)
    private CVSection sectionName;

    @Column(name = "score", nullable = false, updatable = false)
    private Long score; // Thang diem 100

    @Column(name = "comment", nullable = false, updatable = false, length = 512)
    private String comment;

    // Relation
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private CVAssessment cvAssessment;
}
