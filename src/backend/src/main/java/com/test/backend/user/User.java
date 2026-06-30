package com.test.backend.user;

import com.test.backend.aiInterviewSession.AiInterviewSession;
import com.test.backend.booking.Booking;
import com.test.backend.cvAssessment.CVAssessment;
import com.test.backend.position.Position;
import com.test.backend.socialAccount.SocialAccount;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
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
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "email", nullable = false, unique = true)
    @Email
    private String email;

    @Column(name = "user_name", length = 50)
    private String userName;

    @Column(name = "full_name", length = 150)
    private String fullName;

    @Column(name = "linkedin_url", length = 512)
    private String linkedinUrl;

    @Column(name = "githubz_url", length = 512)
    private String githubUrl;

    @Column(name = "role", nullable = false)
    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(name = "is_enabled", nullable = false)
    @ColumnDefault("false")
    @Builder.Default
    private Boolean isEnabled = Boolean.FALSE;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<SocialAccount> socialAccountSet = new HashSet<>();

    @Builder.Default
    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<AiInterviewSession> aiInterviewSessionList = new ArrayList<>();

    @Builder.Default
    @OneToMany(fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "user_id", nullable = false)
    private List<CVAssessment> cvAssessmentList = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "booker", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<Booking> bookingList = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "interviewer", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<Booking> inteviewList = new ArrayList<>();
}
