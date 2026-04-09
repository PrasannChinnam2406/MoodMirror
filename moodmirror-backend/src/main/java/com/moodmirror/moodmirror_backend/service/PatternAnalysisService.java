package com.moodmirror.moodmirror_backend.service;

import com.moodmirror.moodmirror_backend.entity.MoodEntry;
import com.moodmirror.moodmirror_backend.entity.MoodPattern;
import com.moodmirror.moodmirror_backend.entity.User;
import com.moodmirror.moodmirror_backend.repository.MoodEntryRepository;
import com.moodmirror.moodmirror_backend.repository.MoodPatternRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PatternAnalysisService {

    private final MoodEntryRepository moodEntryRepository;
    private final MoodPatternRepository moodPatternRepository;
    private final GeminiService geminiService;

    private static final String[] DAY_NAMES = {"", "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday", "Sunday"};

    // Run full pattern analysis for a user (called after every 5 entries)
    public List<MoodPattern> analyzeAndSavePatterns(User user) {
        long entryCount = moodEntryRepository.countByUser(user);
        if (entryCount < 5) {
            return List.of(); // Not enough data yet
        }

        List<MoodPattern> patterns = new ArrayList<>();

        // 1. Detect weekly low points
        patterns.addAll(detectWeeklyLowPoints(user));

        // 2. Detect time-based patterns
        patterns.addAll(detectTimeBasedPatterns(user));

        // 3. Detect what makes mood worse (context triggers)
        patterns.addAll(detectContextTriggers(user));

        // 4. Detect which music actually helps
        patterns.addAll(detectMusicEffectiveness(user));

        // Save patterns
        for (MoodPattern pattern : patterns) {
            // Deactivate old patterns of same type for this user
            moodPatternRepository.findByUser(user).stream()
                .filter(p -> p.getPatternType().equals(pattern.getPatternType()))
                .forEach(p -> {
                    p.setIsActive(false);
                    moodPatternRepository.save(p);
                });
            moodPatternRepository.save(pattern);
        }

        return patterns;
    }

    // Detect which days of the week user feels worst
    private List<MoodPattern> detectWeeklyLowPoints(User user) {
        List<Object[]> dayAvgs = moodEntryRepository.getAvgMoodByDayOfWeek(user);
        List<MoodPattern> patterns = new ArrayList<>();

        if (dayAvgs.isEmpty()) return patterns;

        // Find the lowest scoring day
        Object[] lowest = dayAvgs.stream()
            .min(Comparator.comparingDouble(row -> (Double) row[1]))
            .orElse(null);

        if (lowest == null) return patterns;

        double lowestAvg = (Double) lowest[1];
        double overallAvg = dayAvgs.stream()
            .mapToDouble(row -> (Double) row[1]).average().orElse(5.0);

        // Only flag if significantly below average
        if (lowestAvg < overallAvg - 1.0) {
            int dayNum = ((Number) lowest[0]).intValue();
            String dayName = dayNum >= 1 && dayNum <= 7 ? DAY_NAMES[dayNum] : "Unknown";

            // Get LLM to explain this pattern
            String context = String.format(
                "User's average mood on %s is %.1f/10, while their overall average is %.1f/10. " +
                "Their mood is noticeably lower on this day.",
                dayName, lowestAvg, overallAvg
            );

            String description = geminiService.analyzePatterns(context);

            MoodPattern pattern = new MoodPattern();
            pattern.setUser(user);
            pattern.setPatternType("WEEKLY_LOW");
            pattern.setDescription("📅 " + dayName + " pattern: " + description);
            pattern.setConfidence(Math.min(0.9, (overallAvg - lowestAvg) / 3.0));
            patterns.add(pattern);
        }

        return patterns;
    }

    // Detect time-of-day patterns
    private List<MoodPattern> detectTimeBasedPatterns(User user) {
        List<Object[]> hourAvgs = moodEntryRepository.getAvgMoodByHourOfDay(user);
        List<MoodPattern> patterns = new ArrayList<>();

        if (hourAvgs.size() < 3) return patterns;

        // Find hours with consistently low mood
        double overallAvg = hourAvgs.stream()
            .mapToDouble(row -> (Double) row[1]).average().orElse(5.0);

        for (Object[] row : hourAvgs) {
            int hour = ((Number) row[0]).intValue();
            double avg = (Double) row[1];

            if (avg < overallAvg - 1.5) {
                String timeLabel = hour < 12 ? hour + "am" : (hour == 12 ? "12pm" : (hour - 12) + "pm");

                MoodPattern pattern = new MoodPattern();
                pattern.setUser(user);
                pattern.setPatternType("TIME_BASED");
                pattern.setDescription("⏰ You tend to feel low around " + timeLabel +
                    " (avg score: " + String.format("%.1f", avg) + "/10). " +
                    "Consider scheduling something enjoyable or a short break at this time.");
                pattern.setConfidence(0.7);
                patterns.add(pattern);
                break; // Only report the worst time slot
            }
        }

        return patterns;
    }

    // Detect which contexts (work, study, etc.) drain the user most
    private List<MoodPattern> detectContextTriggers(User user) {
        List<MoodEntry> allEntries = moodEntryRepository.findByUserOrderByCreatedAtDesc(user);
        List<MoodPattern> patterns = new ArrayList<>();

        if (allEntries.size() < 5) return patterns;

        // Group by context and calculate average mood
        Map<String, List<Integer>> contextScores = new HashMap<>();
        for (MoodEntry entry : allEntries) {
            if (entry.getContextTag() != null && entry.getMoodScore() != null) {
                contextScores.computeIfAbsent(entry.getContextTag(), k -> new ArrayList<>())
                    .add(entry.getMoodScore());
            }
        }

        double overallAvg = allEntries.stream()
            .filter(e -> e.getMoodScore() != null)
            .mapToInt(MoodEntry::getMoodScore)
            .average().orElse(5.0);

        contextScores.entrySet().stream()
            .filter(e -> e.getValue().size() >= 2)
            .forEach(entry -> {
                double avg = entry.getValue().stream().mapToInt(i -> i).average().orElse(5.0);
                if (avg < overallAvg - 1.5) {
                    String emoji = getContextEmoji(entry.getKey());
                    MoodPattern pattern = new MoodPattern();
                    pattern.setUser(user);
                    pattern.setPatternType("CONTEXT_TRIGGER");
                    pattern.setDescription(emoji + " " + entry.getKey() + " situations consistently lower your mood " +
                        "(avg: " + String.format("%.1f", avg) + "/10 vs your overall " +
                        String.format("%.1f", overallAvg) + "/10). " +
                        "Try setting boundaries or adding recovery time after these situations.");
                    pattern.setConfidence(0.75);
                    patterns.add(pattern);
                }
            });

        return patterns;
    }

    // Detect which music genres actually improve user's mood
    private List<MoodPattern> detectMusicEffectiveness(User user) {
        List<Object[]> effectiveness = moodEntryRepository.getMusicEffectiveness(user);
        List<MoodPattern> patterns = new ArrayList<>();

        for (Object[] row : effectiveness) {
            String emotion = (String) row[0];
            double helpRate = (Double) row[1];

            if (helpRate >= 0.7) {
                MoodPattern pattern = new MoodPattern();
                pattern.setUser(user);
                pattern.setPatternType("MUSIC_EFFECTIVE");
                pattern.setDescription("🎵 Music works really well for you when you're feeling " +
                    emotion.toLowerCase() + " — it helps " + (int)(helpRate * 100) + "% of the time. " +
                    "Keep using it as a mood booster in these moments!");
                pattern.setConfidence(helpRate);
                patterns.add(pattern);
            }
        }

        return patterns;
    }

    // Build summary for dashboard
    public Map<String, Object> buildMoodSummary(User user) {
        List<Object[]> dayAvgs = moodEntryRepository.getAvgMoodByDayOfWeek(user);
        List<Object[]> emotionFreq = moodEntryRepository.getEmotionFrequency(user);
        long totalEntries = moodEntryRepository.countByUser(user);

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalEntries", totalEntries);
        summary.put("dayAverages", formatDayAverages(dayAvgs));
        summary.put("emotionFrequency", formatEmotionFrequency(emotionFreq));
        summary.put("dataReady", totalEntries >= 5);

        return summary;
    }

    private List<Map<String, Object>> formatDayAverages(List<Object[]> raw) {
        return raw.stream().map(row -> {
            Map<String, Object> m = new HashMap<>();
            int dayNum = ((Number) row[0]).intValue();
            m.put("day", dayNum >= 1 && dayNum <= 7 ? DAY_NAMES[dayNum] : "Unknown");
            m.put("avgScore", Math.round(((Double) row[1]) * 10.0) / 10.0);
            return m;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> formatEmotionFrequency(List<Object[]> raw) {
        return raw.stream().map(row -> {
            Map<String, Object> m = new HashMap<>();
            m.put("emotion", row[0]);
            m.put("count", row[1]);
            return m;
        }).collect(Collectors.toList());
    }

    private String getContextEmoji(String context) {
        return switch (context) {
            case "WORK" -> "💼";
            case "STUDY" -> "📚";
            case "HEALTH" -> "🏥";
            case "SOCIAL" -> "👥";
            case "PERSONAL" -> "🏠";
            default -> "📌";
        };
    }
}