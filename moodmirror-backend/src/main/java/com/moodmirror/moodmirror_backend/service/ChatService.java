package com.moodmirror.moodmirror_backend.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.moodmirror.moodmirror_backend.entity.MoodEntry;
import com.moodmirror.moodmirror_backend.entity.User;
import com.moodmirror.moodmirror_backend.repository.MoodEntryRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final MoodEntryRepository moodEntryRepository;

    @Value("${gemini.api.key}")
    private String apiKey;

    private final WebClient webClient = WebClient.builder().build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String[] MODELS = {
        "gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"
    };

    public String chat(String userMessage, List<Map<String, String>> history, User user) {
        // Build context from user's mood history
        String moodContext = buildMoodContext(user);

        // Build system prompt with personal context
        String systemPrompt = buildSystemPrompt(user, moodContext);

        // Build conversation history for Gemini
        String fullPrompt = buildFullPrompt(systemPrompt, history, userMessage);

        // Call Gemini
        String response = callGemini(fullPrompt);
        if (response != null) return response;

        // Fallback response
        return buildFallbackResponse(userMessage, moodContext);
    }

    public String generateStarterMessage(User user) {
        List<MoodEntry> recent = moodEntryRepository
            .findRecentByUser(user, PageRequest.of(0, 5));

        if (recent.isEmpty()) {
            return "Hi " + user.getUsername() + "! 👋 I'm your MoodMirror companion. I'm here to listen and chat whenever you need. How are you feeling today?";
        }

        MoodEntry latest = recent.get(0);
        String emotion = latest.getDetectedEmotion();
        int score = latest.getMoodScore() != null ? latest.getMoodScore() : 5;

        // Count recent sad/anxious entries
        long lowMoodCount = recent.stream()
            .filter(e -> e.getMoodScore() != null && e.getMoodScore() <= 4)
            .count();

        if (lowMoodCount >= 3) {
            return "Hey " + user.getUsername() + " 💙 I noticed you've been having a tough few days. I'm here if you want to talk about what's been going on. No pressure — I'm just here to listen.";
        }

        return switch (emotion) {
            case "SAD" -> "Hey " + user.getUsername() + " 💙 I saw your last entry — you seemed a bit down. Want to tell me what's going on? I'm here to listen.";
            case "ANXIOUS" -> "Hi " + user.getUsername() + " 🌿 I noticed you've been feeling anxious lately. Want to talk through what's on your mind?";
            case "ANGRY" -> "Hey " + user.getUsername() + " — looks like something's been frustrating you. Want to vent? I'm all ears, no judgment.";
            case "TIRED" -> "Hi " + user.getUsername() + " 😌 You seem exhausted lately. Want to talk about what's draining your energy?";
            case "HAPPY" -> "Hey " + user.getUsername() + "! 🌟 You seem to be in a good place! What's been making you feel great? Let's talk!";
            default -> "Hi " + user.getUsername() + "! I'm your MoodMirror companion. I know a bit about how you've been feeling lately — want to chat?";
        };
    }

    private String buildMoodContext(User user) {
        List<MoodEntry> recent = moodEntryRepository
            .findRecentByUser(user, PageRequest.of(0, 10));

        if (recent.isEmpty()) return "No mood history yet.";

        StringBuilder ctx = new StringBuilder();
        ctx.append("User's recent mood history:\n");

        // Last 5 entries summary
        recent.stream().limit(5).forEach(e -> {
            ctx.append(String.format("- %s: %s (score %d/10, %s energy, context: %s)\n",
                e.getCreatedAt().toLocalDate(),
                e.getDetectedEmotion(),
                e.getMoodScore() != null ? e.getMoodScore() : 5,
                e.getEnergyLevel() != null ? e.getEnergyLevel() : "MEDIUM",
                e.getContextTag() != null ? e.getContextTag() : "OTHER"
            ));
        });

        // Average mood
        double avg = recent.stream()
            .filter(e -> e.getMoodScore() != null)
            .mapToInt(MoodEntry::getMoodScore)
            .average().orElse(5.0);
        ctx.append(String.format("\nAverage mood score: %.1f/10\n", avg));

        // Most common emotion
        recent.stream()
            .filter(e -> e.getDetectedEmotion() != null)
            .collect(Collectors.groupingBy(MoodEntry::getDetectedEmotion, Collectors.counting()))
            .entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .ifPresent(e -> ctx.append("Most frequent emotion: ").append(e.getKey()).append("\n"));

        // Music preference
        long helpedCount = recent.stream().filter(e -> Boolean.TRUE.equals(e.getMusicHelped())).count();
        if (helpedCount > 0) {
            ctx.append("Music has helped this user ").append(helpedCount).append(" times.\n");
        }

        return ctx.toString();
    }

    private String buildSystemPrompt(User user, String moodContext) {
        return """
            You are MoodMirror's empathetic AI companion for %s.
            You are warm, caring, and non-judgmental — like a supportive friend, not a therapist.
            
            CRITICAL RULES:
            1. Keep responses SHORT (2-4 sentences max). Never give long lectures.
            2. Ask ONE follow-up question at a time to encourage sharing.
            3. Be conversational and natural — use simple everyday language.
            4. Reference the user's mood history naturally when relevant.
            5. If user seems in crisis or mentions self-harm → ALWAYS say: "I care about you. Please reach out to iCall (India): 9152987821 or a trusted person."
            6. Never pretend to be a doctor or therapist.
            7. Occasionally suggest music if it fits ("want me to suggest a playlist?")
            8. Use emojis sparingly — only when they feel natural.
            9. If user asks about their patterns, refer to their mood data.
            10. Always end with either a question OR a gentle suggestion — never just a statement.
            
            %s
            
            Your personality: warm, curious, supportive, occasionally playful. Never preachy.
            """.formatted(user.getUsername(), moodContext);
    }

    private String buildFullPrompt(String systemPrompt, List<Map<String, String>> history, String userMessage) {
        StringBuilder prompt = new StringBuilder();
        prompt.append(systemPrompt).append("\n\n");
        prompt.append("Conversation so far:\n");

        for (Map<String, String> msg : history) {
            String role = msg.getOrDefault("role", "user");
            String content = msg.getOrDefault("content", "");
            if (role.equals("user")) {
                prompt.append("User: ").append(content).append("\n");
            } else {
                prompt.append("You: ").append(content).append("\n");
            }
        }

        prompt.append("\nUser: ").append(userMessage).append("\n");
        prompt.append("You (respond warmly and briefly):");

        return prompt.toString();
    }

    private String callGemini(String prompt) {
        for (String model : MODELS) {
            try {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + model + ":generateContent?key=" + apiKey;

                Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                    "generationConfig", Map.of("temperature", 0.8, "maxOutputTokens", 200)
                );

                String response = webClient.post()
                    .uri(url)
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                        cr -> cr.bodyToMono(String.class)
                            .flatMap(e -> reactor.core.publisher.Mono.error(new RuntimeException(e))))
                    .bodyToMono(String.class)
                    .block();

                JsonNode root = objectMapper.readTree(response);
                String text = root.path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText("");

                if (!text.isEmpty()) {
                    log.info("Chat response from model: {}", model);
                    return text.trim();
                }
            } catch (Exception e) {
                log.warn("Chat model {} failed: {}", model, e.getMessage());
            }
        }
        return null;
    }

    private String buildFallbackResponse(String message, String context) {
        String lower = message.toLowerCase();

        // Crisis detection
        if (lower.contains("suicide") || lower.contains("kill myself") ||
            lower.contains("end my life") || lower.contains("want to die")) {
            return "I hear you, and I'm really glad you're talking about this 💙 What you're feeling matters. Please reach out to iCall right now: 9152987821 — they're trained to help and will listen without judgment. You don't have to face this alone.";
        }

        if (lower.contains("sad") || lower.contains("cry") || lower.contains("depressed")) {
            return "I'm really sorry you're feeling this way 💙 It takes courage to acknowledge when you're hurting. Want to tell me a bit more about what's been going on?";
        }
        if (lower.contains("stress") || lower.contains("anxious") || lower.contains("worried")) {
            return "Stress can feel so overwhelming sometimes 😮‍💨 You're not alone in this. What's been weighing on you the most lately?";
        }
        if (lower.contains("happy") || lower.contains("good") || lower.contains("great")) {
            return "That's really wonderful to hear! 🌟 Good moments deserve to be celebrated. What's been making you feel this way?";
        }
        if (lower.contains("tired") || lower.contains("exhausted")) {
            return "Being exhausted is really tough — both physically and mentally 😌 Are you getting enough rest, or is something keeping you up?";
        }
        if (lower.contains("angry") || lower.contains("frustrated")) {
            return "That frustration makes complete sense 💪 Sometimes things just build up. What happened — do you want to talk through it?";
        }

        return "I hear you 💙 I'm here and I'm listening. Can you tell me more about what's on your mind right now?";
    }
}