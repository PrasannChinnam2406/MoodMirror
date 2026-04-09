package com.moodmirror.moodmirror_backend.dto;

import lombok.Data;

@Data
public class MoodHistoryItem {
    private Long id;
    private String rawInput;
    private String detectedEmotion;
    private Integer moodScore;
    private String energyLevel;
    private String contextTag;
    private String insight;
    private String playlistName;
    private String playlistId;
    private Boolean musicHelped;
    private String createdAt;
}