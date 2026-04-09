package com.moodmirror.moodmirror_backend.dto;

import java.util.List;

import com.moodmirror.moodmirror_backend.service.SpotifyService;

import lombok.Data;

@Data
public class MoodResponse {
    private Long entryId;
    private String detectedEmotion;
    private int moodScore;
    private String energyLevel;
    private String contextTag;
    private String insight;
    private String playlistId;
    private String playlistName;
    private String playlistUrl;
    private String playlistImageUrl;
    private String whyExplanation;
    private String youtubeMusicUrl;
    private int newPatternsFound;
    private int totalEntries;

    // NEW — real song list from Last.fm
    private List<SpotifyService.TrackInfo> tracks;

    // NEW — wellness tips
    private List<String> wellnessTips;
}