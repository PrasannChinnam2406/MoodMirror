package com.moodmirror.moodmirror_backend.dto;

import lombok.Data;

@Data
public class PatternDto {
    private Long id;
    private String patternType;
    private String description;
    private Double confidence;
    private String detectedAt;
}