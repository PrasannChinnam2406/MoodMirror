package com.moodmirror.moodmirror_backend.entity;


import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "mood_patterns")
@Data
@NoArgsConstructor
public class MoodPattern {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Pattern type: WEEKLY_LOW, TIME_BASED, CONTEXT_TRIGGER, MUSIC_EFFECTIVE
    @Column(name = "pattern_type")
    private String patternType;

    // Human-readable description of the pattern
    @Column(name = "description", length = 1000)
    private String description;

    // Confidence of this pattern (0.0 to 1.0)
    @Column(name = "confidence")
    private Double confidence;

    // When pattern was detected
    @Column(name = "detected_at")
    private LocalDateTime detectedAt = LocalDateTime.now();

    // Is this pattern still active?
    @Column(name = "is_active")
    private Boolean isActive = true;
}
