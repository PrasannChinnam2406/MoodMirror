package com.moodmirror.moodmirror_backend.service;

import com.moodmirror.moodmirror_backend.entity.MoodEntry;
import com.moodmirror.moodmirror_backend.entity.User;
import com.moodmirror.moodmirror_backend.repository.MoodEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatsService {

    private final MoodEntryRepository moodEntryRepository;
    private final GeminiService geminiService;

    // Full stats: streak + comparison + badges
    public Map<String, Object> getFullStats(User user) {
        Map<String, Object> stats = new HashMap<>();

        List<MoodEntry> allEntries = moodEntryRepository.findByUserOrderByCreatedAtDesc(user);

        // 1. Streak calculation
        int streak = calculateStreak(allEntries);
        stats.put("currentStreak", streak);
        stats.put("longestStreak", calculateLongestStreak(allEntries));
        stats.put("totalEntries", allEntries.size());

        // 2. Badges earned
        stats.put("badges", calculateBadges(allEntries, streak));

        // 3. This week vs last week comparison
        Map<String, Object> comparison = getWeekComparison(allEntries);
        stats.put("weekComparison", comparison);

        // 4. Best and worst day names
        stats.put("bestDay", getBestDay(user));
        stats.put("worstDay", getWorstDay(user));

        // 5. Overall average
        double avg = allEntries.stream()
            .filter(e -> e.getMoodScore() != null)
            .mapToInt(MoodEntry::getMoodScore)
            .average().orElse(0.0);
        stats.put("overallAverage", Math.round(avg * 10.0) / 10.0);

        // 6. Most frequent emotion
        allEntries.stream()
            .filter(e -> e.getDetectedEmotion() != null)
            .collect(Collectors.groupingBy(MoodEntry::getDetectedEmotion, Collectors.counting()))
            .entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .ifPresent(e -> stats.put("dominantEmotion", e.getKey()));

        return stats;
    }

    // Heatmap: last 90 days, each day has a mood score
    public List<Map<String, Object>> getHeatmapData(User user) {
        LocalDate today = LocalDate.now();
        LocalDate ninetyDaysAgo = today.minusDays(89);

        List<MoodEntry> entries = moodEntryRepository
            .findByUserAndCreatedAtAfterOrderByCreatedAtDesc(
                user, ninetyDaysAgo.atStartOfDay());

        // Group by date, average score
        Map<LocalDate, List<Integer>> byDate = new LinkedHashMap<>();
        for (MoodEntry e : entries) {
            LocalDate date = e.getCreatedAt().toLocalDate();
            byDate.computeIfAbsent(date, k -> new ArrayList<>()).add(e.getMoodScore() != null ? e.getMoodScore() : 5);
        }

        // Build 90-day array
        List<Map<String, Object>> heatmap = new ArrayList<>();
        for (int i = 89; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            List<Integer> scores = byDate.get(date);

            Map<String, Object> day = new HashMap<>();
            day.put("date", date.toString());
            day.put("dayOfWeek", date.getDayOfWeek().getValue()); // 1=Mon, 7=Sun

            if (scores != null && !scores.isEmpty()) {
                double avg = scores.stream().mapToInt(s -> s).average().orElse(0);
                day.put("score", Math.round(avg));
                day.put("count", scores.size());
                day.put("hasData", true);
            } else {
                day.put("score", 0);
                day.put("count", 0);
                day.put("hasData", false);
            }
            heatmap.add(day);
        }
        return heatmap;
    }

    // Weekly report: this week vs last week with Gemini insight
    public Map<String, Object> getWeeklyReport(User user) {
        LocalDateTime thisWeekStart = LocalDate.now().minusDays(6).atStartOfDay();
        LocalDateTime lastWeekStart = LocalDate.now().minusDays(13).atStartOfDay();
        LocalDateTime lastWeekEnd = LocalDate.now().minusDays(7).atStartOfDay();

        List<MoodEntry> allRecent = moodEntryRepository
            .findByUserAndCreatedAtAfterOrderByCreatedAtDesc(user, lastWeekStart);

        List<MoodEntry> thisWeek = allRecent.stream()
            .filter(e -> e.getCreatedAt().isAfter(thisWeekStart))
            .collect(Collectors.toList());

        List<MoodEntry> lastWeek = allRecent.stream()
            .filter(e -> e.getCreatedAt().isAfter(lastWeekStart) && e.getCreatedAt().isBefore(lastWeekEnd))
            .collect(Collectors.toList());

        double thisAvg = thisWeek.stream().filter(e -> e.getMoodScore() != null)
            .mapToInt(MoodEntry::getMoodScore).average().orElse(0.0);
        double lastAvg = lastWeek.stream().filter(e -> e.getMoodScore() != null)
            .mapToInt(MoodEntry::getMoodScore).average().orElse(0.0);

        double diff = Math.round((thisAvg - lastAvg) * 10.0) / 10.0;
        String trend = diff > 0.5 ? "IMPROVING" : diff < -0.5 ? "DECLINING" : "STABLE";

        // Best day this week
        Optional<MoodEntry> bestEntry = thisWeek.stream()
            .filter(e -> e.getMoodScore() != null)
            .max(Comparator.comparingInt(MoodEntry::getMoodScore));

        Optional<MoodEntry> worstEntry = thisWeek.stream()
            .filter(e -> e.getMoodScore() != null)
            .min(Comparator.comparingInt(MoodEntry::getMoodScore));

        // Emotion breakdown this week
        Map<String, Long> emotionBreakdown = thisWeek.stream()
            .filter(e -> e.getDetectedEmotion() != null)
            .collect(Collectors.groupingBy(MoodEntry::getDetectedEmotion, Collectors.counting()));

        // Gemini weekly insight
        String weeklyInsight = generateWeeklyInsight(thisAvg, lastAvg, trend, emotionBreakdown);

        Map<String, Object> report = new HashMap<>();
        report.put("thisWeekAvg", Math.round(thisAvg * 10.0) / 10.0);
        report.put("lastWeekAvg", Math.round(lastAvg * 10.0) / 10.0);
        report.put("difference", diff);
        report.put("trend", trend);
        report.put("thisWeekEntries", thisWeek.size());
        report.put("lastWeekEntries", lastWeek.size());
        report.put("emotionBreakdown", emotionBreakdown);
        report.put("weeklyInsight", weeklyInsight);
        report.put("bestDay", bestEntry.map(e -> e.getCreatedAt().toLocalDate().toString()).orElse(null));
        report.put("bestScore", bestEntry.map(MoodEntry::getMoodScore).orElse(null));
        report.put("worstDay", worstEntry.map(e -> e.getCreatedAt().toLocalDate().toString()).orElse(null));
        report.put("worstScore", worstEntry.map(MoodEntry::getMoodScore).orElse(null));

        return report;
    }

    // --- Helper methods ---

    private int calculateStreak(List<MoodEntry> entries) {
        if (entries.isEmpty()) return 0;

        Set<LocalDate> loggedDates = entries.stream()
            .map(e -> e.getCreatedAt().toLocalDate())
            .collect(Collectors.toSet());

        int streak = 0;
        LocalDate check = LocalDate.now();

        // Allow today or yesterday to count as streak start
        if (!loggedDates.contains(check)) {
            check = check.minusDays(1);
        }

        while (loggedDates.contains(check)) {
            streak++;
            check = check.minusDays(1);
        }
        return streak;
    }

    private int calculateLongestStreak(List<MoodEntry> entries) {
        if (entries.isEmpty()) return 0;

        List<LocalDate> dates = entries.stream()
            .map(e -> e.getCreatedAt().toLocalDate())
            .distinct()
            .sorted()
            .collect(Collectors.toList());

        int longest = 1, current = 1;
        for (int i = 1; i < dates.size(); i++) {
            if (ChronoUnit.DAYS.between(dates.get(i-1), dates.get(i)) == 1) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 1;
            }
        }
        return longest;
    }

    private List<Map<String, Object>> calculateBadges(List<MoodEntry> entries, int streak) {
        List<Map<String, Object>> badges = new ArrayList<>();

        // First entry badge
        if (!entries.isEmpty()) {
            badges.add(badge("🌱", "First Step", "Logged your first mood", true));
        }

        // Streak badges
        badges.add(badge("🔥", "3-Day Streak", "Log mood 3 days in a row", streak >= 3));
        badges.add(badge("⚡", "Week Warrior", "Log mood 7 days in a row", streak >= 7));
        badges.add(badge("💎", "Consistency King", "Log mood 30 days in a row", streak >= 30));

        // Volume badges
        badges.add(badge("📝", "Getting Started", "Log 5 moods", entries.size() >= 5));
        badges.add(badge("🎯", "Dedicated", "Log 25 moods", entries.size() >= 25));
        badges.add(badge("🏆", "MoodMaster", "Log 100 moods", entries.size() >= 100));

        // Music feedback badge
        long feedbackCount = entries.stream().filter(e -> e.getMusicHelped() != null).count();
        badges.add(badge("🎵", "Music Critic", "Rate 10 playlists", feedbackCount >= 10));

        return badges;
    }

    private Map<String, Object> badge(String icon, String name, String desc, boolean earned) {
        Map<String, Object> b = new HashMap<>();
        b.put("icon", icon);
        b.put("name", name);
        b.put("description", desc);
        b.put("earned", earned);
        return b;
    }

    private Map<String, Object> getWeekComparison(List<MoodEntry> allEntries) {
        LocalDateTime thisWeekStart = LocalDate.now().minusDays(6).atStartOfDay();
        LocalDateTime lastWeekStart = LocalDate.now().minusDays(13).atStartOfDay();

        double thisWeekAvg = allEntries.stream()
            .filter(e -> e.getCreatedAt().isAfter(thisWeekStart) && e.getMoodScore() != null)
            .mapToInt(MoodEntry::getMoodScore).average().orElse(0.0);

        double lastWeekAvg = allEntries.stream()
            .filter(e -> e.getCreatedAt().isAfter(lastWeekStart)
                && e.getCreatedAt().isBefore(thisWeekStart) && e.getMoodScore() != null)
            .mapToInt(MoodEntry::getMoodScore).average().orElse(0.0);

        Map<String, Object> comp = new HashMap<>();
        comp.put("thisWeek", Math.round(thisWeekAvg * 10.0) / 10.0);
        comp.put("lastWeek", Math.round(lastWeekAvg * 10.0) / 10.0);
        comp.put("diff", Math.round((thisWeekAvg - lastWeekAvg) * 10.0) / 10.0);
        return comp;
    }

    private String getBestDay(User user) {
        List<Object[]> dayAvgs = moodEntryRepository.getAvgMoodByDayOfWeek(user);
        String[] days = {"", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"};
        return dayAvgs.stream()
            .max(Comparator.comparingDouble(row -> (Double) row[1]))
            .map(row -> days[Math.min(((Number) row[0]).intValue(), 7)])
            .orElse("N/A");
    }

    private String getWorstDay(User user) {
        List<Object[]> dayAvgs = moodEntryRepository.getAvgMoodByDayOfWeek(user);
        String[] days = {"", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"};
        return dayAvgs.stream()
            .min(Comparator.comparingDouble(row -> (Double) row[1]))
            .map(row -> days[Math.min(((Number) row[0]).intValue(), 7)])
            .orElse("N/A");
    }

    private String generateWeeklyInsight(double thisAvg, double lastAvg, String trend,
                                          Map<String, Long> emotions) {
        if (thisAvg == 0) return "Log some moods this week to get your weekly insight!";

        String context = String.format(
            "This week average mood: %.1f/10. Last week: %.1f/10. Trend: %s. " +
            "Emotions this week: %s.",
            thisAvg, lastAvg, trend, emotions.toString()
        );

        try {
            String insight = geminiService.analyzePatterns(context);
            return insight != null ? insight : buildFallbackInsight(thisAvg, lastAvg, trend);
        } catch (Exception e) {
            return buildFallbackInsight(thisAvg, lastAvg, trend);
        }
    }

    private String buildFallbackInsight(double thisAvg, double lastAvg, String trend) {
        if (trend.equals("IMPROVING")) {
            return String.format("Great progress! Your mood improved by %.1f points this week compared to last week. Keep up whatever you're doing — it's working!", thisAvg - lastAvg);
        } else if (trend.equals("DECLINING")) {
            return String.format("Your mood dipped slightly this week (%.1f vs %.1f last week). Remember — tough weeks pass. Try to get some rest and do something you enjoy.", thisAvg, lastAvg);
        }
        return String.format("Steady week! Your mood averaged %.1f/10, similar to last week (%.1f). Consistency is underrated — you're doing well.", thisAvg, lastAvg);
    }
}