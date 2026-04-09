package com.moodmirror.moodmirror_backend.entity;


import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "mood_entries")
@Data
@NoArgsConstructor
public class MoodEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // What user typed: "feeling super stressed about exam"
    @Column(name = "raw_input", length = 1000)
    private String rawInput;

    // LLM-detected emotion: HAPPY, SAD, ANXIOUS, ANGRY, CALM, EXCITED, TIRED
    @Column(name = "detected_emotion")
    private String detectedEmotion;

    // Mood score 1-10 (1=very bad, 10=excellent)
    @Column(name = "mood_score")
    private Integer moodScore;

    // Context: WORK, PERSONAL, HEALTH, SOCIAL, STUDY
    @Column(name = "context_tag")
    private String contextTag;

    // Energy level: LOW, MEDIUM, HIGH
    @Column(name = "energy_level")
    private String energyLevel;

    // Spotify playlist ID generated for this mood
    @Column(name = "playlist_id")
    private String playlistId;

    // Playlist name
    @Column(name = "playlist_name")
    private String playlistName;

    // Did music help? User feedback after listening (null = not yet rated)
    @Column(name = "music_helped")
    private Boolean musicHelped;

    // LLM insight for this entry
    @Column(name = "llm_insight", length = 2000)
    private String llmInsight;

    // When this entry was created
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Day of week (1=Monday ... 7=Sunday) for pattern detection
    @Column(name = "day_of_week")
    private Integer dayOfWeek;

    // Hour of day (0-23) for pattern detection
    @Column(name = "hour_of_day")
    private Integer hourOfDay;
}
