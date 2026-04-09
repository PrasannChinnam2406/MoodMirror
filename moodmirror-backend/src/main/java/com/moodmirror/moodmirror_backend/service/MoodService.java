package com.moodmirror.moodmirror_backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.moodmirror.moodmirror_backend.dto.MoodHistoryItem;
import com.moodmirror.moodmirror_backend.dto.MoodResponse;
import com.moodmirror.moodmirror_backend.dto.PatternDto;
import com.moodmirror.moodmirror_backend.entity.MoodEntry;
import com.moodmirror.moodmirror_backend.entity.MoodPattern;
import com.moodmirror.moodmirror_backend.entity.User;
import com.moodmirror.moodmirror_backend.repository.MoodEntryRepository;
import com.moodmirror.moodmirror_backend.repository.MoodPatternRepository;
import com.moodmirror.moodmirror_backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class MoodService {

    private final MoodEntryRepository moodEntryRepository;
    private final MoodPatternRepository moodPatternRepository;
    private final UserRepository userRepository;
    private final GeminiService geminiService;
    private final SpotifyService spotifyService;
    private final PatternAnalysisService patternAnalysisService;

    @Transactional
    public MoodResponse logMood(String rawInput, User user) {

        // Step 1: Analyze mood with Gemini
        GeminiService.MoodAnalysis analysis = geminiService.analyzeMood(rawInput);

        // Step 2: Get songs from Last.fm
        SpotifyService.PlaylistResult playlist =
            spotifyService.getPlaylistForMood(analysis.searchQuery, analysis.detectedEmotion);

        // Step 3: Save mood entry
        MoodEntry entry = new MoodEntry();
        entry.setUser(user);
        entry.setRawInput(rawInput);
        entry.setDetectedEmotion(analysis.detectedEmotion);
        entry.setMoodScore(analysis.moodScore);
        entry.setEnergyLevel(analysis.energyLevel);
        entry.setContextTag(analysis.contextTag);
        entry.setLlmInsight(analysis.insight);
        entry.setPlaylistId(playlist.playlistId);
        entry.setPlaylistName(playlist.playlistName);
        entry.setCreatedAt(LocalDateTime.now());

        LocalDateTime now = LocalDateTime.now();
        entry.setDayOfWeek(now.getDayOfWeek().getValue());
        entry.setHourOfDay(now.getHour());

        moodEntryRepository.save(entry);

        // Step 4: Update user stats
        user.setTotalEntries(user.getTotalEntries() + 1);
        if (!analysis.genres.isEmpty()) {
            user.setPreferredGenres(analysis.genres);
        }
        userRepository.save(user);

        // Step 5: Run pattern analysis every 5 entries
        List<MoodPattern> newPatterns = new ArrayList<>();
        if (user.getTotalEntries() % 5 == 0) {
            newPatterns = patternAnalysisService.analyzeAndSavePatterns(user);
        }

        // Step 6: Build response with tracks + wellness tips
        MoodResponse response = new MoodResponse();
        response.setEntryId(entry.getId());
        response.setDetectedEmotion(analysis.detectedEmotion);
        response.setMoodScore(analysis.moodScore);
        response.setEnergyLevel(analysis.energyLevel);
        response.setContextTag(analysis.contextTag);
        response.setInsight(analysis.insight);
        response.setPlaylistId(playlist.playlistId);
        response.setPlaylistName(playlist.playlistName);
        response.setPlaylistUrl(playlist.playlistUrl);
        response.setPlaylistImageUrl(playlist.imageUrl);
        response.setWhyExplanation(playlist.whyExplanation);
        response.setYoutubeMusicUrl(playlist.youtubeMusicUrl);
        response.setTracks(playlist.tracks);           // Real song list!
        response.setWellnessTips(playlist.wellnessTips); // Wellness tips!
        response.setNewPatternsFound(newPatterns.size());
        response.setTotalEntries(user.getTotalEntries());

        return response;
    }

    @Transactional
    public void submitMusicFeedback(Long entryId, boolean helped, User user) {
        moodEntryRepository.findById(entryId).ifPresent(entry -> {
            if (entry.getUser().getId().equals(user.getId())) {
                entry.setMusicHelped(helped);
                moodEntryRepository.save(entry);
            }
        });
    }

    public List<MoodHistoryItem> getMoodHistory(User user, int limit) {
        List<MoodEntry> entries = moodEntryRepository
            .findRecentByUser(user, PageRequest.of(0, limit));

        return entries.stream().map(e -> {
            MoodHistoryItem item = new MoodHistoryItem();
            item.setId(e.getId());
            item.setRawInput(e.getRawInput());
            item.setDetectedEmotion(e.getDetectedEmotion());
            item.setMoodScore(e.getMoodScore());
            item.setEnergyLevel(e.getEnergyLevel());
            item.setContextTag(e.getContextTag());
            item.setInsight(e.getLlmInsight());
            item.setPlaylistName(e.getPlaylistName());
            item.setPlaylistId(e.getPlaylistId());
            item.setMusicHelped(e.getMusicHelped());
            item.setCreatedAt(e.getCreatedAt().toString());
            return item;
        }).toList();
    }

    public List<PatternDto> getPatterns(User user) {
        return moodPatternRepository
            .findByUserAndIsActiveTrueOrderByConfidenceDesc(user)
            .stream().map(p -> {
                PatternDto dto = new PatternDto();
                dto.setId(p.getId());
                dto.setPatternType(p.getPatternType());
                dto.setDescription(p.getDescription());
                dto.setConfidence(p.getConfidence());
                dto.setDetectedAt(p.getDetectedAt().toString());
                return dto;
            }).toList();
    }

    public Map<String, Object> getAnalytics(User user) {
        Map<String, Object> analytics = patternAnalysisService.buildMoodSummary(user);

        List<MoodEntry> recent = moodEntryRepository
            .findRecentByUser(user, PageRequest.of(0, 30));

        List<Map<String, Object>> chartData = recent.stream().map(e -> {
            Map<String, Object> point = new HashMap<>();
            point.put("date", e.getCreatedAt().toLocalDate().toString());
            point.put("score", e.getMoodScore());
            point.put("emotion", e.getDetectedEmotion());
            return point;
        }).toList();

        analytics.put("moodTimeline", chartData);
        return analytics;
    }
}