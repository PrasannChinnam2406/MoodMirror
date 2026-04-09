package com.moodmirror.moodmirror_backend.controller;

import com.moodmirror.moodmirror_backend.entity.User;
import com.moodmirror.moodmirror_backend.repository.UserRepository;
import com.moodmirror.moodmirror_backend.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final UserRepository userRepository;

    // POST /api/chat/message
    // Body: { "message": "I'm feeling really down today", "history": [...] }
    @PostMapping("/message")
    public ResponseEntity<?> sendMessage(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        String message = (String) body.get("message");
        List<Map<String, String>> history = (List<Map<String, String>>) body.getOrDefault("history", List.of());

        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message is empty"));
        }

        User user = userRepository.findByUsername(userDetails.getUsername())
            .orElseThrow(() -> new RuntimeException("User not found"));

        String reply = chatService.chat(message.trim(), history, user);
        return ResponseEntity.ok(Map.of("reply", reply));
    }

    // GET /api/chat/starter - get opening message based on user's mood history
    @GetMapping("/starter")
    public ResponseEntity<?> getStarterMessage(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByUsername(userDetails.getUsername())
            .orElseThrow(() -> new RuntimeException("User not found"));

        String starter = chatService.generateStarterMessage(user);
        return ResponseEntity.ok(Map.of("message", starter));
    }
}