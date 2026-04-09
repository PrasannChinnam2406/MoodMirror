package com.moodmirror.moodmirror_backend.scheduler;

import com.moodmirror.moodmirror_backend.entity.MoodEntry;
import com.moodmirror.moodmirror_backend.entity.User;
import com.moodmirror.moodmirror_backend.repository.MoodEntryRepository;
import com.moodmirror.moodmirror_backend.repository.UserRepository;
import com.moodmirror.moodmirror_backend.service.GeminiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class PredictiveNudgeScheduler {

    private final UserRepository userRepository;
    private final MoodEntryRepository moodEntryRepository;
    private final GeminiService geminiService;

    // In-memory store of pending nudges per user (in production, use WebSockets or push notifications)
    private static final Map<Long, String> pendingNudges = new HashMap<>();

    // Runs every hour — checks if any user has a predicted low mood coming
    @Scheduled(fixedRate = 3600000)
    public void checkForPredictiveMoodNudges() {
        log.info("Running predictive nudge check...");

        List<User> users = userRepository.findAll();
        int currentHour = LocalDateTime.now().getHour();
        int currentDay = LocalDateTime.now().getDayOfWeek().getValue();

        for (User user : users) {
            if (user.getTotalEntries() < 10) continue; // Need enough data

            try {
                generateNudgeIfNeeded(user, currentHour, currentDay);
            } catch (Exception e) {
                log.error("Nudge generation failed for user {}: {}", user.getUsername(), e.getMessage());
            }
        }
    }

    private void generateNudgeIfNeeded(User user, int currentHour, int currentDay) {
        // Get entries for this same day+hour from history
        List<MoodEntry> sameDayEntries = moodEntryRepository.findByUserAndDayOfWeek(user, currentDay);

        if (sameDayEntries.isEmpty()) return;

        // Calculate average mood for this day
        double avgMoodThisDay = sameDayEntries.stream()
            .filter(e -> e.getMoodScore() != null)
            .mapToInt(MoodEntry::getMoodScore)
            .average().orElse(5.0);

        // Calculate overall average
        double overallAvg = moodEntryRepository.findByUserOrderByCreatedAtDesc(user)
            .stream()
            .filter(e -> e.getMoodScore() != null)
            .mapToInt(MoodEntry::getMoodScore)
            .average().orElse(5.0);

        // If this day is a low point, generate a nudge
        if (avgMoodThisDay < overallAvg - 1.0) {
            String dayName = getDayName(currentDay);
            String context = String.format(
                "User historically has low mood on %s (avg %.1f vs overall avg %.1f). " +
                "It is currently %d:00. Generate a warm preemptive message.",
                dayName, avgMoodThisDay, overallAvg, currentHour
            );

            String nudge = geminiService.generatePrediction(context);
            if (nudge != null) {
                pendingNudges.put(user.getId(), nudge);
                log.info("Nudge generated for user {}", user.getUsername());
            }
        }
    }

    // Called by frontend polling to get nudge
    public static String getAndClearNudge(Long userId) {
        return pendingNudges.remove(userId);
    }

    private String getDayName(int day) {
        String[] days = {"", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"};
        return day >= 1 && day <= 7 ? days[day] : "today";
    }
}