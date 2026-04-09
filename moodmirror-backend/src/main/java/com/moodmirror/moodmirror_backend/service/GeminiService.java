package com.moodmirror.moodmirror_backend.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    // Try models in order until one works
    private static final String[] MODELS = {
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-pro"
    };

    private String workingModel = null;

    public GeminiService() {
        this.webClient = WebClient.builder().build();
        this.objectMapper = new ObjectMapper();
    }

    public MoodAnalysis analyzeMood(String userInput) {
        String prompt = """
            Analyze this user's mood input and return a JSON response.
            User input: "%s"
            
            Return ONLY valid JSON in this exact format (no markdown, no explanation):
            {
                "detectedEmotion": "HAPPY",
                "moodScore": 7,
                "energyLevel": "HIGH",
                "contextTag": "PERSONAL",
                "insight": "You seem to be feeling great today!",
                "musicGenres": ["pop", "indie", "upbeat"],
                "searchQuery": "happy upbeat pop music"
            }
            
            Rules:
            - detectedEmotion must be one of: HAPPY, SAD, ANXIOUS, ANGRY, CALM, EXCITED, TIRED
            - moodScore: 1=very bad, 5=neutral, 10=excellent
            - energyLevel: LOW, MEDIUM, or HIGH
            - contextTag: WORK, PERSONAL, HEALTH, SOCIAL, STUDY, or OTHER
            - insight: one warm empathetic sentence
            - searchQuery: natural search for music matching this mood
            """.formatted(userInput);

        try {
            String response = callGeminiWithFallback(prompt);
            if (response != null) {
                return parseMoodAnalysis(response);
            }
        } catch (Exception e) {
            log.error("Gemini mood analysis failed: {}", e.getMessage());
        }
        return defaultMoodAnalysis(userInput);
    }

    public String analyzePatterns(String patternData) {
        String prompt = """
            You are an empathetic emotional intelligence assistant.
            Based on this user's mood history data, provide a warm, insightful analysis.
            Data: %s
            Write 2-3 sentences that point out the most interesting pattern,
            give one actionable suggestion, and end with an encouraging note.
            Be conversational and warm. Max 100 words.
            """.formatted(patternData);

        try {
            String response = callGeminiWithFallback(prompt);
            if (response != null) return extractText(response);
        } catch (Exception e) {
            log.error("Pattern analysis failed: {}", e.getMessage());
        }
        return "Keep logging your moods — patterns take a little time to emerge. You're doing great!";
    }

    public String generatePrediction(String historicalContext) {
        String prompt = """
            Based on this user's historical mood patterns: %s
            Write a short warm predictive message (max 50 words) that acknowledges
            an upcoming mood pattern and suggests a preemptive action.
            Feel like a caring friend, not a robot.
            """.formatted(historicalContext);

        try {
            String response = callGeminiWithFallback(prompt);
            if (response != null) return extractText(response);
        } catch (Exception e) {
            log.error("Prediction failed: {}", e.getMessage());
        }
        return null;
    }

    private String callGeminiWithFallback(String prompt) {
        // If we already found a working model, use it directly
        if (workingModel != null) {
            try {
                return callGemini(prompt, workingModel);
            } catch (Exception e) {
                log.warn("Previously working model {} failed, retrying others", workingModel);
                workingModel = null;
            }
        }

        // Try each model until one works
        for (String model : MODELS) {
            try {
                log.info("Trying Gemini model: {}", model);
                String result = callGemini(prompt, model);
                workingModel = model;
                log.info("Gemini model {} worked!", model);
                return result;
            } catch (Exception e) {
                log.warn("Model {} failed: {}", model, e.getMessage());
            }
        }

        log.error("All Gemini models failed!");
        return null;
    }

    private String callGemini(String prompt, String model) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
            + model + ":generateContent?key=" + apiKey;

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(Map.of("text", prompt)))
            ),
            "generationConfig", Map.of(
                "temperature", 0.7,
                "maxOutputTokens", 512
            )
        );

        return webClient.post()
            .uri(url)
            .header("Content-Type", "application/json")
            .bodyValue(requestBody)
            .retrieve()
            .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                clientResponse -> clientResponse.bodyToMono(String.class)
                    .flatMap(error -> {
                        log.error("Gemini {} error: {}", model, error);
                        return reactor.core.publisher.Mono.error(new RuntimeException("Gemini " + model + " failed: " + error));
                    })
            )
            .bodyToMono(String.class)
            .block();
    }

    private String extractText(String geminiResponse) throws Exception {
        JsonNode root = objectMapper.readTree(geminiResponse);
        return root.path("candidates").get(0)
            .path("content").path("parts").get(0)
            .path("text").asText("");
    }

    private MoodAnalysis parseMoodAnalysis(String geminiResponse) throws Exception {
        String text = extractText(geminiResponse);

        // Clean markdown if present
        text = text.replaceAll("```json", "").replaceAll("```", "").trim();

        // Find JSON object in response
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            text = text.substring(start, end + 1);
        }

        log.info("Parsed Gemini text: {}", text);
        JsonNode json = objectMapper.readTree(text);

        MoodAnalysis analysis = new MoodAnalysis();
        analysis.detectedEmotion = json.path("detectedEmotion").asText("CALM");
        analysis.moodScore = json.path("moodScore").asInt(5);
        analysis.energyLevel = json.path("energyLevel").asText("MEDIUM");
        analysis.contextTag = json.path("contextTag").asText("OTHER");
        analysis.insight = json.path("insight").asText("Taking a moment to reflect is always a good idea.");
        analysis.searchQuery = json.path("searchQuery").asText("feel good music");

        JsonNode genresNode = json.path("musicGenres");
        if (genresNode.isArray()) {
            StringBuilder genres = new StringBuilder();
            for (JsonNode g : genresNode) {
                if (genres.length() > 0) genres.append(",");
                genres.append(g.asText());
            }
            analysis.genres = genres.toString();
        } else {
            analysis.genres = "pop,indie";
        }

        return analysis;
    }

    private MoodAnalysis defaultMoodAnalysis(String input) {
        // Smart default based on keywords
        MoodAnalysis analysis = new MoodAnalysis();
        String lower = input.toLowerCase();

        if (lower.contains("happy") || lower.contains("great") || lower.contains("good") || lower.contains("excited")) {
            analysis.detectedEmotion = "HAPPY";
            analysis.moodScore = 8;
            analysis.insight = "You're radiating positive energy today — keep it up!";
        } else if (lower.contains("sad") || lower.contains("cry") || lower.contains("depress") || lower.contains("low marks") || lower.contains("fail")) {
            analysis.detectedEmotion = "SAD";
            analysis.moodScore = 3;
            analysis.insight = "It's okay to feel sad. Every setback is a setup for a comeback.";
        } else if (lower.contains("stress") || lower.contains("anxious") || lower.contains("worry") || lower.contains("nervous")) {
            analysis.detectedEmotion = "ANXIOUS";
            analysis.moodScore = 4;
            analysis.insight = "Take a deep breath. You're handling more than you realize.";
        } else if (lower.contains("angry") || lower.contains("frustrated") || lower.contains("mad")) {
            analysis.detectedEmotion = "ANGRY";
            analysis.moodScore = 3;
            analysis.insight = "Your feelings are valid. Music can help release that tension.";
        } else if (lower.contains("tired") || lower.contains("exhausted") || lower.contains("sleep")) {
            analysis.detectedEmotion = "TIRED";
            analysis.moodScore = 4;
            analysis.insight = "Rest is productive. Your body is asking for a break.";
        } else {
            analysis.detectedEmotion = "CALM";
            analysis.moodScore = 6;
            analysis.insight = "Taking a moment to check in with yourself is a great habit.";
        }

        analysis.energyLevel = analysis.moodScore >= 7 ? "HIGH" : analysis.moodScore >= 5 ? "MEDIUM" : "LOW";
        analysis.contextTag = "OTHER";
        analysis.searchQuery = analysis.detectedEmotion.toLowerCase() + " music playlist";
        analysis.genres = "pop,indie";
        return analysis;
    }

    public static class MoodAnalysis {
        public String detectedEmotion;
        public int moodScore;
        public String energyLevel;
        public String contextTag;
        public String insight;
        public String genres;
        public String searchQuery;
    }
}