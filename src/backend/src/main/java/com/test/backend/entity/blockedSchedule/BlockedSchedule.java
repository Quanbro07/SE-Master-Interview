package com.test.backend.entity.blockedSchedule;

import com.test.backend.entity.user.interviewer.Interviewer;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "blocked_schedule")
public class BlockedSchedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "blocked_schedule_id", nullable = false, updatable = false)
    private Long blockedScheduleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false)
    private BlockedSchedulePurpose purpose;

    @Column(name = "note")
    private String note;

    @Column(name = "start_datetime", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_datetime", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interviewer_id", updatable = false, nullable = false)
    private Interviewer interviewer;

    @PrePersist
    @PreUpdate
    private void validateTimeBeforeSave() {
        if (startTime != null && endTime != null && !startTime.isBefore(endTime)) {
            throw new IllegalArgumentException(" Error - Blocked Schedule! " +
                    "startTime must be before endTime");
        }
    }
}
