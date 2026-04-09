package com.moodmirror.moodmirror_backend.repository;

import com.moodmirror.moodmirror_backend.entity.MoodEntry;
import com.moodmirror.moodmirror_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface MoodEntryRepository extends JpaRepository<MoodEntry, Long> {

    // Get all entries for a user, newest first
    List<MoodEntry> findByUserOrderByCreatedAtDesc(User user);

    // Get entries for a user in last N days
    List<MoodEntry> findByUserAndCreatedAtAfterOrderByCreatedAtDesc(User user, LocalDateTime after);

    // Get entries by day of week (pattern detection)
    List<MoodEntry> findByUserAndDayOfWeek(User user, Integer dayOfWeek);

    // Get entries by hour range (pattern detection)
    List<MoodEntry> findByUserAndHourOfDayBetween(User user, Integer startHour, Integer endHour);

    // Average mood score by day of week
    @Query("SELECT m.dayOfWeek, AVG(m.moodScore) FROM MoodEntry m WHERE m.user = :user GROUP BY m.dayOfWeek ORDER BY m.dayOfWeek")
    List<Object[]> getAvgMoodByDayOfWeek(@Param("user") User user);

    // Average mood score by hour of day
    @Query("SELECT m.hourOfDay, AVG(m.moodScore) FROM MoodEntry m WHERE m.user = :user GROUP BY m.hourOfDay ORDER BY m.hourOfDay")
    List<Object[]> getAvgMoodByHourOfDay(@Param("user") User user);

    // Most common emotions
    @Query("SELECT m.detectedEmotion, COUNT(m) FROM MoodEntry m WHERE m.user = :user GROUP BY m.detectedEmotion ORDER BY COUNT(m) DESC")
    List<Object[]> getEmotionFrequency(@Param("user") User user);

    // Music effectiveness - which genres helped most
    @Query("SELECT m.detectedEmotion, AVG(CASE WHEN m.musicHelped = true THEN 1.0 ELSE 0.0 END) FROM MoodEntry m WHERE m.user = :user AND m.musicHelped IS NOT NULL GROUP BY m.detectedEmotion")
    List<Object[]> getMusicEffectiveness(@Param("user") User user);

    // Count entries per user
    long countByUser(User user);

    // Recent entries limit
    @Query("SELECT m FROM MoodEntry m WHERE m.user = :user ORDER BY m.createdAt DESC")
    List<MoodEntry> findRecentByUser(@Param("user") User user, org.springframework.data.domain.Pageable pageable);
}