package com.moodmirror.moodmirror_backend.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
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
public class SpotifyService {

    @Value("${lastfm.api.key}")
    private String apiKey;

    private static final String BASE_URL = "https://ws.audioscrobbler.com/2.0/";

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    // Mood → Last.fm tags for searching
    private static final Map<String, List<String>> MOOD_TAGS = Map.of(
        "HAPPY",   List.of("happy", "feel-good", "upbeat", "cheerful"),
        "SAD",     List.of("sad", "melancholy", "emotional", "heartbreak"),
        "ANXIOUS", List.of("calm", "relaxing", "ambient", "meditation"),
        "ANGRY",   List.of("angry", "intense", "rock", "metal"),
        "CALM",    List.of("chill", "peaceful", "acoustic", "soft"),
        "EXCITED", List.of("energetic", "pump-up", "hype", "upbeat"),
        "TIRED",   List.of("sleep", "soft", "lullaby", "ambient")
    );

    // Why each mood maps to these songs
    private static final Map<String, String> MOOD_EXPLANATIONS = Map.of(
        "HAPPY",   "Upbeat tempo and positive lyrics reinforce dopamine release and boost your existing good mood",
        "SAD",     "Songs with emotional resonance help process feelings — you feel understood, not alone",
        "ANXIOUS", "Slow tempo (60-80 BPM) and calm harmonies activate the parasympathetic nervous system",
        "ANGRY",   "High-energy music channels frustration productively — a healthy emotional release valve",
        "CALM",    "Gentle acoustics and soft melodies maintain your peaceful state without overstimulation",
        "EXCITED", "Fast tempo and energetic beats match and amplify your excitement — ride the wave",
        "TIRED",   "Soft, slow music reduces mental load and gently guides your mind toward rest"
    );

    // Wellness tips per mood
    private static final Map<String, List<String>> WELLNESS_TIPS = Map.of(
        "HAPPY",   List.of("Share your good mood with someone you care about 💛", "Write down 3 things making you happy today 📝", "This is a great time to tackle something challenging 🚀"),
        "SAD",     List.of("Take 5 slow deep breaths right now 😮‍💨", "A 10-minute walk outside can shift your mood 🚶", "Talk to someone you trust — you don't have to carry this alone 💙"),
        "ANXIOUS", List.of("Try box breathing: inhale 4s, hold 4s, exhale 4s 🫁", "Put your phone away for 30 minutes 📵", "Write down what's worrying you — it shrinks on paper ✍️"),
        "ANGRY",   List.of("Step away from the situation for 10 minutes ⏱", "Drink a glass of cold water slowly 💧", "Physical movement helps — try 10 jumping jacks 🏃"),
        "CALM",    List.of("This is a great state for creative work or journaling 🎨", "Practice gratitude — think of 3 good things 🙏", "Your body is relaxed — use this time wisely 🌿"),
        "EXCITED", List.of("Channel this energy into a goal or project ⚡", "Capture your ideas — excitement breeds creativity 💡", "Share your excitement — it's contagious in a good way! 🎉"),
        "TIRED",   List.of("Even a 20-minute nap can restore focus 😴", "Hydrate — fatigue is often mild dehydration 💧", "Avoid screens for the next 30 minutes before resting 📵")
    );

    public SpotifyService() {
        this.webClient = WebClient.builder().build();
        this.objectMapper = new ObjectMapper();
    }

    public PlaylistResult getPlaylistForMood(String searchQuery, String emotion) {
        try {
            List<String> tags = MOOD_TAGS.getOrDefault(emotion, List.of("chill"));
            String tag = tags.get(0);

            // Get top tracks for this mood tag
            String url = BASE_URL + "?method=tag.gettoptracks"
                + "&tag=" + URLEncoder.encode(tag, StandardCharsets.UTF_8)
                + "&api_key=" + apiKey
                + "&format=json"
                + "&limit=8";

            String response = webClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            List<TrackInfo> tracks = parseTopTracks(response, emotion);

            PlaylistResult result = new PlaylistResult();
            result.playlistId = "lastfm-" + emotion.toLowerCase();
            result.playlistName = getMoodPlaylistName(emotion);
            result.playlistUrl = "https://www.last.fm/tag/" + tag + "/tracks";
            result.youtubeMusicUrl = "https://music.youtube.com/search?q=" + URLEncoder.encode(tag + " music playlist", StandardCharsets.UTF_8);
            result.imageUrl = tracks.isEmpty() ? "" : tracks.get(0).imageUrl;
            result.description = MOOD_EXPLANATIONS.getOrDefault(emotion, "Songs matched to your emotional state");
            result.trackCount = tracks.size();
            result.tracks = tracks;
            result.whyExplanation = MOOD_EXPLANATIONS.getOrDefault(emotion, "");
            result.wellnessTips = WELLNESS_TIPS.getOrDefault(emotion, List.of());

            log.info("Last.fm: fetched {} tracks for mood {}", tracks.size(), emotion);
            return result;

        } catch (Exception e) {
            log.error("Last.fm API failed: {}", e.getMessage());
            return getFallbackPlaylist(emotion);
        }
    }

    private List<TrackInfo> parseTopTracks(String response, String emotion) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        JsonNode tracks = root.path("tracks").path("track");

        List<TrackInfo> result = new ArrayList<>();
        if (!tracks.isArray()) return result;

        for (JsonNode track : tracks) {
            TrackInfo info = new TrackInfo();
            info.trackName = track.path("name").asText();
            info.artistName = track.path("artist").path("name").asText();
            info.spotifyUrl = track.path("url").asText();

            // Get album image
            JsonNode images = track.path("image");
            if (images.isArray() && images.size() > 1) {
                info.imageUrl = images.get(1).path("#text").asText("");
            }

            info.playcount = track.path("playcount").asLong(0);
            info.youtubeMusicUrl = "https://music.youtube.com/search?q=" + URLEncoder.encode(info.trackName + " " + info.artistName, StandardCharsets.UTF_8);
            info.whyThisSong = generateSongExplanation(info.trackName, info.artistName, emotion);

            if (!info.trackName.isEmpty() && !info.artistName.isEmpty()) {
                result.add(info);
            }
        }
        return result;
    }

    private String generateSongExplanation(String track, String artist, String emotion) {
        // Smart explanations based on emotion
        return switch (emotion) {
            case "HAPPY"   -> "Upbeat energy and positive vibes to amplify your good mood 🌟";
            case "SAD"     -> "Emotional resonance helps you feel understood and process your feelings 💙";
            case "ANXIOUS" -> "Calming tempo reduces cortisol levels and eases mental tension 🌿";
            case "ANGRY"   -> "Channels frustration into powerful energy — a healthy emotional release 🔥";
            case "CALM"    -> "Gentle melodies maintain your peaceful state without disruption 😌";
            case "EXCITED" -> "High-energy rhythm matches your excitement and keeps the momentum ⚡";
            case "TIRED"   -> "Soft sounds reduce mental load and help your mind unwind 🌙";
            default        -> "Matched to your current emotional state for best effect";
        };
    }

    private String getMoodPlaylistName(String emotion) {
        return switch (emotion) {
            case "HAPPY"   -> "Happy Vibes Mix 🌟";
            case "SAD"     -> "Healing & Comfort Mix 💙";
            case "ANXIOUS" -> "Calm & Breathe Mix 🌿";
            case "ANGRY"   -> "Release & Reset Mix 🔥";
            case "CALM"    -> "Peaceful Chill Mix 😌";
            case "EXCITED" -> "High Energy Mix ⚡";
            case "TIRED"   -> "Rest & Recharge Mix 🌙";
            default        -> "MoodMirror Mix 🎵";
        };
    }

    private PlaylistResult getFallbackPlaylist(String emotion) {
        PlaylistResult result = new PlaylistResult();
        result.playlistId = "fallback-" + emotion.toLowerCase();
        result.playlistName = getMoodPlaylistName(emotion);
        result.playlistUrl = "https://www.last.fm/search?q=" + emotion.toLowerCase() + "+music";
        result.youtubeMusicUrl = "https://music.youtube.com/search?q=" + URLEncoder.encode(emotion.toLowerCase() + " music playlist", StandardCharsets.UTF_8);
        result.imageUrl = "";
        result.description = MOOD_EXPLANATIONS.getOrDefault(emotion, "");
        result.trackCount = 0;
        result.tracks = getFallbackTracks(emotion);
        result.whyExplanation = MOOD_EXPLANATIONS.getOrDefault(emotion, "");
        result.wellnessTips = WELLNESS_TIPS.getOrDefault(emotion, List.of());
        return result;
    }

    private List<TrackInfo> getFallbackTracks(String emotion) {
        Map<String, List<String[]>> fallbacks = new HashMap<>();
        fallbacks.put("HAPPY", List.of(
            new String[]{"Happy", "Pharrell Williams", "https://www.last.fm/music/Pharrell+Williams/_/Happy"},
            new String[]{"Good as Hell", "Lizzo", "https://www.last.fm/music/Lizzo/_/Good+as+Hell"},
            new String[]{"Can't Stop the Feeling", "Justin Timberlake", "https://www.last.fm/music/Justin+Timberlake/_/Can%27t+Stop+the+Feeling%21"},
            new String[]{"Uptown Funk", "Mark Ronson ft. Bruno Mars", "https://www.last.fm/music/Mark+Ronson/_/Uptown+Funk"},
            new String[]{"Walking on Sunshine", "Katrina and the Waves", "https://www.last.fm/music/Katrina+and+the+Waves/_/Walking+on+Sunshine"}
        ));
        fallbacks.put("SAD", List.of(
            new String[]{"The Night We Met", "Lord Huron", "https://www.last.fm/music/Lord+Huron/_/The+Night+We+Met"},
            new String[]{"Someone Like You", "Adele", "https://www.last.fm/music/Adele/_/Someone+Like+You"},
            new String[]{"Fix You", "Coldplay", "https://www.last.fm/music/Coldplay/_/Fix+You"},
            new String[]{"Let Her Go", "Passenger", "https://www.last.fm/music/Passenger/_/Let+Her+Go"},
            new String[]{"Skinny Love", "Bon Iver", "https://www.last.fm/music/Bon+Iver/_/Skinny+Love"}
        ));
        fallbacks.put("ANXIOUS", List.of(
            new String[]{"Weightless", "Marconi Union", "https://www.last.fm/music/Marconi+Union/_/Weightless"},
            new String[]{"Breathe (2 AM)", "Anna Nalick", "https://www.last.fm/music/Anna+Nalick/_/Breathe+%282+AM%29"},
            new String[]{"Clair de Lune", "Debussy", "https://www.last.fm/music/Claude+Debussy/_/Clair+de+lune"},
            new String[]{"Experience", "Ludovico Einaudi", "https://www.last.fm/music/Ludovico+Einaudi/_/Experience"},
            new String[]{"River Flows in You", "Yiruma", "https://www.last.fm/music/Yiruma/_/River+Flows+in+You"}
        ));
        fallbacks.put("CALM", List.of(
            new String[]{"Holocene", "Bon Iver", "https://www.last.fm/music/Bon+Iver/_/Holocene"},
            new String[]{"Yellow", "Coldplay", "https://www.last.fm/music/Coldplay/_/Yellow"},
            new String[]{"Bloom", "The Paper Kites", "https://www.last.fm/music/The+Paper+Kites/_/Bloom"},
            new String[]{"Electric Feel", "MGMT", "https://www.last.fm/music/MGMT/_/Electric+Feel"},
            new String[]{"Lua", "Bright Eyes", "https://www.last.fm/music/Bright+Eyes/_/Lua"}
        ));
        fallbacks.put("EXCITED", List.of(
            new String[]{"Lose Yourself", "Eminem", "https://www.last.fm/music/Eminem/_/Lose+Yourself"},
            new String[]{"Eye of the Tiger", "Survivor", "https://www.last.fm/music/Survivor/_/Eye+of+the+Tiger"},
            new String[]{"Thunder", "Imagine Dragons", "https://www.last.fm/music/Imagine+Dragons/_/Thunder"},
            new String[]{"Radioactive", "Imagine Dragons", "https://www.last.fm/music/Imagine+Dragons/_/Radioactive"},
            new String[]{"Stronger", "Kanye West", "https://www.last.fm/music/Kanye+West/_/Stronger"}
        ));
        fallbacks.put("ANGRY", List.of(
            new String[]{"Breaking the Habit", "Linkin Park", "https://www.last.fm/music/Linkin+Park/_/Breaking+the+Habit"},
            new String[]{"In the End", "Linkin Park", "https://www.last.fm/music/Linkin+Park/_/In+the+End"},
            new String[]{"Numb", "Linkin Park", "https://www.last.fm/music/Linkin+Park/_/Numb"},
            new String[]{"Given Up", "Linkin Park", "https://www.last.fm/music/Linkin+Park/_/Given+Up"},
            new String[]{"Faint", "Linkin Park", "https://www.last.fm/music/Linkin+Park/_/Faint"}
        ));
        fallbacks.put("TIRED", List.of(
            new String[]{"Asleep", "The Smiths", "https://www.last.fm/music/The+Smiths/_/Asleep"},
            new String[]{"Dream a Little Dream", "Mamas & Papas", "https://www.last.fm/music/The+Mamas+%26+The+Papas/_/Dream+a+Little+Dream+of+Me"},
            new String[]{"Sleepyhead", "Passion Pit", "https://www.last.fm/music/Passion+Pit/_/Sleepyhead"},
            new String[]{"The Night", "Zac Brown Band", "https://www.last.fm/music/Zac+Brown+Band/_/The+Night"},
            new String[]{"Lullaby", "Sigur Rós", "https://www.last.fm/music/Sigur+R%C3%B3s/_/Lullaby"}
        ));

        List<String[]> songs = fallbacks.getOrDefault(emotion, fallbacks.get("CALM"));
        List<TrackInfo> tracks = new ArrayList<>();
        for (String[] song : songs) {
            TrackInfo t = new TrackInfo();
            t.trackName = song[0];
            t.artistName = song[1];
            t.spotifyUrl = song[2];
            t.imageUrl = "";
            t.whyThisSong = generateSongExplanation(song[0], song[1], emotion);
            t.youtubeMusicUrl = "https://music.youtube.com/search?q=" + URLEncoder.encode(song[0] + " " + song[1], StandardCharsets.UTF_8);
            tracks.add(t);
        }
        return tracks;
    }

    public List<TrackInfo> getPlaylistTracks(String playlistId) {
        return List.of();
    }

    public static class PlaylistResult {
        public String playlistId;
        public String playlistName;
        public String playlistUrl;
        public String imageUrl;
        public String description;
        public int trackCount;
        public List<TrackInfo> tracks = new ArrayList<>();
        public String whyExplanation;
        public String youtubeMusicUrl;
        public List<String> wellnessTips = new ArrayList<>();
    }

    public static class TrackInfo {
        public String trackName;
        public String artistName;
        public String spotifyUrl;
        public String previewUrl;
        public String imageUrl;
        public long playcount;
        public String whyThisSong;
        public String youtubeMusicUrl;
        public int durationMs;
    }
}