package com.moodmirror.moodmirror_backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.moodmirror.moodmirror_backend.dto.MoodHistoryItem;
import com.moodmirror.moodmirror_backend.dto.MoodResponse;
import com.moodmirror.moodmirror_backend.dto.PatternDto;
import com.moodmirror.moodmirror_backend.entity.User;
import com.moodmirror.moodmirror_backend.repository.UserRepository;
import com.moodmirror.moodmirror_backend.service.MoodService;
import com.moodmirror.moodmirror_backend.service.StatsService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/mood")
@RequiredArgsConstructor
public class MoodController {

    private final MoodService moodService;
    private final UserRepository userRepository;
    private final StatsService statsService;

    @PostMapping("/log")
    public ResponseEntity<?> logMood(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        String rawInput = body.get("rawInput");
        if (rawInput == null || rawInput.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please describe how you're feeling"));
        }
        User user = getUser(userDetails);
        MoodResponse response = moodService.logMood(rawInput.trim(), user);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{entryId}/feedback")
    public ResponseEntity<?> submitFeedback(
            @PathVariable Long entryId,
            @RequestBody Map<String, Boolean> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        Boolean helped = body.get("helped");
        if (helped == null) return ResponseEntity.badRequest().body(Map.of("error", "Missing 'helped' field"));
        User user = getUser(userDetails);
        moodService.submitMusicFeedback(entryId, helped, user);
        return ResponseEntity.ok(Map.of("message", "Feedback saved!"));
    }

    @GetMapping("/history")
    public ResponseEntity<List<MoodHistoryItem>> getHistory(
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(moodService.getMoodHistory(getUser(userDetails), limit));
    }

    @GetMapping("/patterns")
    public ResponseEntity<List<PatternDto>> getPatterns(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(moodService.getPatterns(getUser(userDetails)));
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(moodService.getAnalytics(getUser(userDetails)));
    }

    // ---- NEW ENDPOINTS ----

    // GET /api/mood/stats - streak, comparison, weekly report
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(statsService.getFullStats(getUser(userDetails)));
    }

    // GET /api/mood/heatmap - calendar heatmap data
    @GetMapping("/heatmap")
    public ResponseEntity<List<Map<String, Object>>> getHeatmap(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(statsService.getHeatmapData(getUser(userDetails)));
    }

    // GET /api/mood/weekly-report - this week vs last week
    @GetMapping("/weekly-report")
    public ResponseEntity<Map<String, Object>> getWeeklyReport(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(statsService.getWeeklyReport(getUser(userDetails)));
    }

    private User getUser(UserDetails userDetails) {
        return userRepository.findByUsername(userDetails.getUsername())
            .orElseThrow(() -> new RuntimeException("User not found"));
    }
}