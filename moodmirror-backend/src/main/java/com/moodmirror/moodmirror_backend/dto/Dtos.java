package com.moodmirror.moodmirror_backend.dto;

import lombok.Data;

// ---- Auth DTOs ----

@Data
class RegisterRequest {
    public String username;
    public String email;
    public String password;
}

@Data
class LoginRequest {
    public String username;
    public String password;
}

@Data
class AuthResponse {
    public String token;
    public String username;
    public String email;
    public int totalEntries;
}

// ---- Mood DTOs ----

@Data
class LogMoodRequest {
    public String rawInput; // "feeling super stressed about exam tmrw"
}
