package com.moodmirror.moodmirror_backend.controller;

import com.moodmirror.moodmirror_backend.entity.User;
import com.moodmirror.moodmirror_backend.repository.UserRepository;
import com.moodmirror.moodmirror_backend.scheduler.PredictiveNudgeScheduler;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/nudge")
@RequiredArgsConstructor
public class NudgeController {

    private final UserRepository userRepository;

    // GET /api/nudge — frontend polls this every 10 mins
    @GetMapping
    public ResponseEntity<?> getNudge(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
            .orElseThrow(() -> new RuntimeException("User not found"));

        String nudge = PredictiveNudgeScheduler.getAndClearNudge(user.getId());

        if (nudge != null) {
            return ResponseEntity.ok(Map.of("nudge", nudge, "hasNudge", true));
        }
        return ResponseEntity.ok(Map.of("hasNudge", false));
    }
}