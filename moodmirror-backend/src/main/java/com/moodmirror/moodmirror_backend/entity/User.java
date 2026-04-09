package com.moodmirror.moodmirror_backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Preferred genres learned over time (comma-separated)
    @Column(name = "preferred_genres", length = 500)
    private String preferredGenres = "";

    // Average mood score (1-10) tracked over time
    @Column(name = "avg_mood_score")
    private Double avgMoodScore = 5.0;

    // Total mood entries logged
    @Column(name = "total_entries")
    private Integer totalEntries = 0;
}
