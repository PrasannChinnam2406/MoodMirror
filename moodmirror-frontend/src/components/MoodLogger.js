import React, { useState } from "react";
import { logMood, submitFeedback } from "../services/api";

const EMOTION_CONFIG = {
  HAPPY: { emoji: "😊", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  SAD: { emoji: "😢", color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE" },
  ANXIOUS: { emoji: "😰", color: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE" },
  ANGRY: { emoji: "😤", color: "#EF4444", bg: "#FFF1F2", border: "#FECACA" },
  CALM: { emoji: "😌", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
  EXCITED: { emoji: "🤩", color: "#F97316", bg: "#FFF7ED", border: "#FED7AA" },
  TIRED: { emoji: "😴", color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" },
};

export default function MoodLogger() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [expandedSong, setExpandedSong] = useState(null);
  const [error, setError] = useState("");

  const handleLog = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setFeedbackGiven(false);
    setExpandedSong(null);
    try {
      const res = await logMood(input);
      setResult(res.data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleFeedback = async (helped) => {
    if (!result) return;
    try {
      await submitFeedback(result.entryId, helped);
      setFeedbackGiven(true);
    } catch (e) {}
  };

  const cfg = result
    ? EMOTION_CONFIG[result.detectedEmotion] || EMOTION_CONFIG.CALM
    : null;

  return (
    <div style={s.container}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .song-row:hover{background:#f5f3ff!important;}
        textarea:focus{outline:none;border-color:#667eea!important;box-shadow:0 0 0 3px rgba(102,126,234,0.12)!important;}
        .analyze-btn:hover{opacity:0.9;transform:translateY(-1px);}
        .new-btn:hover{background:#ece9ff!important;border-color:#c4b5fd!important;}
      `}</style>

      {!result ? (
        <div style={s.inputCard}>
          <div style={s.inputTop}>
            <div style={s.bigEmoji}>🪞</div>
            <h2 style={s.inputTitle}>How are you feeling right now?</h2>
            <p style={s.inputHint}>
              Type freely — any language, any style. Be completely honest.
            </p>
          </div>
          <textarea
            style={s.textarea}
            rows={5}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && handleLog()}
            placeholder={
              "e.g. 'super stressed about exam, can't focus at all'\nor 'feeling happy!! got amazing news today 😊'\nor 'exhausted and nothing feels exciting'"
            }
          />
          {error && <div style={s.errorBox}>{error}</div>}
          <button
            className="analyze-btn"
            style={{
              ...s.analyzeBtn,
              opacity: loading || !input.trim() ? 0.55 : 1,
            }}
            onClick={handleLog}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <span style={s.loadRow}>
                <span style={s.spinner} /> Analyzing your mood...
              </span>
            ) : (
              "✦ Analyze & Get Music"
            )}
          </button>
          <p style={s.hint2}>Ctrl+Enter to submit</p>
        </div>
      ) : (
        <div
          style={{
            animation: "fadeIn 0.4s ease",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Emotion card */}
          <div
            style={{
              ...s.emotionCard,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
            }}
          >
            <div style={s.emotionRow}>
              <span style={s.bigEmoji2}>{cfg.emoji}</span>
              <div style={s.emotionInfo}>
                <div style={{ ...s.emotionName, color: cfg.color }}>
                  {result.detectedEmotion}
                </div>
                <div style={s.emotionMeta}>
                  {result.contextTag} · {result.energyLevel} energy
                </div>
              </div>
              {/* Score ring */}
              <div style={s.scoreWrap}>
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle
                    cx="30"
                    cy="30"
                    r="24"
                    fill="none"
                    stroke="rgba(0,0,0,0.07)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="30"
                    cy="30"
                    r="24"
                    fill="none"
                    stroke={cfg.color}
                    strokeWidth="4"
                    strokeDasharray={`${(result.moodScore / 10) * 150.8} 150.8`}
                    strokeLinecap="round"
                    transform="rotate(-90 30 30)"
                  />
                </svg>
                <div style={s.scoreInner}>
                  <span style={{ ...s.scoreNum, color: cfg.color }}>
                    {result.moodScore}
                  </span>
                  <span style={s.scoreDenom}>/10</span>
                </div>
              </div>
            </div>
            <div style={s.insightRow}>
              <span style={{ color: cfg.color }}>✦</span>
              <p style={s.insightTxt}>{result.insight}</p>
            </div>
          </div>

          {/* Why this music */}
          {result.whyExplanation && (
            <div style={s.whyCard}>
              <div style={s.whyHeader}>
                <span>🧠</span>
                <span style={s.whyTitle}>Why this music for your mood?</span>
              </div>
              <p style={s.whyText}>{result.whyExplanation}</p>
            </div>
          )}

          {/* Songs list */}
          <div style={s.songsCard}>
            <div style={s.songsHeader}>
              <div>
                <div style={s.songsTitle}>🎵 {result.playlistName}</div>
                <div style={s.songsSub}>
                  {result.tracks && result.tracks.length > 0
                    ? `${result.tracks.length} songs from Last.fm · tap a song to see why it fits your mood`
                    : "Curated for your mood"}
                </div>
              </div>
              <div style={s.headerBtns}>
                <a
                  href={result.playlistUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={s.lastfmBtn}
                >
                  Last.fm ↗
                </a>
                {result.youtubeMusicUrl && (
                  <a
                    href={result.youtubeMusicUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={s.ytBtn}
                  >
                    ▶ YouTube Music
                  </a>
                )}
              </div>
            </div>

            {/* Real songs from Last.fm API */}
            {result.tracks && result.tracks.length > 0 ? (
              <div style={s.songList}>
                {result.tracks.map((track, i) => (
                  <div key={i}>
                    <div
                      className="song-row"
                      style={s.songRow}
                      onClick={() =>
                        setExpandedSong(expandedSong === i ? null : i)
                      }
                    >
                      <div style={{ ...s.songNum, color: cfg.color }}>
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      {track.imageUrl ? (
                        <img
                          src={track.imageUrl}
                          alt=""
                          style={s.albumArt}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            ...s.albumArtPlaceholder,
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                          }}
                        >
                          🎵
                        </div>
                      )}
                      <div style={s.songInfo}>
                        <div style={s.songName}>{track.trackName}</div>
                        <div style={s.songArtist}>{track.artistName}</div>
                      </div>
                      <div style={s.songActions}>
                        {/* YouTube Music per song */}
                        {track.youtubeMusicUrl && (
                          <a
                            href={track.youtubeMusicUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={s.ytSongBtn}
                            onClick={(e) => e.stopPropagation()}
                            title="Play on YouTube Music"
                          >
                            ▶
                          </a>
                        )}
                        <a
                          href={track.spotifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={s.listenBtn}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Last.fm
                        </a>
                        <span style={{ ...s.expandArrow, color: cfg.color }}>
                          {expandedSong === i ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>
                    {/* Why this song expanded */}
                    {expandedSong === i && (
                      <div
                        style={{
                          ...s.songWhyBox,
                          borderLeft: `3px solid ${cfg.color}`,
                        }}
                      >
                        <span style={{ fontSize: 14 }}>💡</span>
                        <span style={s.songWhyText}>{track.whyThisSong}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={s.noSongs}>
                Songs are loading... try again in a moment
              </div>
            )}
          </div>

          {/* Wellness tips */}
          {result.wellnessTips && result.wellnessTips.length > 0 && (
            <div style={s.wellnessCard}>
              <div style={s.wellnessHeader}>
                <span>🌿</span>
                <span style={s.wellnessTitle}>
                  Beyond Music — Feel Better Now
                </span>
              </div>
              <div style={s.tipsList}>
                {result.wellnessTips.map((tip, i) => (
                  <div key={i} style={s.tipItem}>
                    <span style={{ ...s.tipArrow, color: cfg.color }}>→</span>
                    <span style={s.tipText}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {!feedbackGiven ? (
            <div style={s.feedbackCard}>
              <p style={s.feedbackQ}>Did the music help your mood?</p>
              <div style={s.feedbackBtns}>
                <button style={s.yesBtn} onClick={() => handleFeedback(true)}>
                  👍 Yes, helped!
                </button>
                <button style={s.noBtn} onClick={() => handleFeedback(false)}>
                  👎 Not really
                </button>
              </div>
              <p style={s.feedbackHint}>
                Your feedback teaches MoodMirror what music works for YOU
              </p>
            </div>
          ) : (
            <div style={s.feedbackDone}>
              ✅ Saved! MoodMirror is learning your music preferences.
            </div>
          )}

          {result.newPatternsFound > 0 && (
            <div style={s.patternAlert}>
              🔍 {result.newPatternsFound} new pattern
              {result.newPatternsFound > 1 ? "s" : ""} discovered! Check{" "}
              <strong>Insights</strong> tab.
            </div>
          )}

          <button
            className="new-btn"
            style={s.newBtn}
            onClick={() => {
              setResult(null);
              setInput("");
              setFeedbackGiven(false);
            }}
          >
            + Log Another Mood
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { maxWidth: 600, margin: "0 auto", padding: "0 16px" },

  inputCard: {
    background: "#fff",
    borderRadius: 20,
    padding: 32,
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    border: "1px solid #f0f0f0",
  },
  inputTop: { textAlign: "center", marginBottom: 24 },
  bigEmoji: { fontSize: 40, marginBottom: 10 },
  inputTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111",
    margin: "0 0 6px",
    letterSpacing: "-0.5px",
  },
  inputHint: { color: "#888", fontSize: 14, margin: 0 },
  textarea: {
    width: "100%",
    padding: "14px 16px",
    border: "1.5px solid #e8e8e8",
    borderRadius: 14,
    fontSize: 15,
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
    lineHeight: 1.7,
    color: "#333",
    background: "#fafafa",
    transition: "all 0.2s",
  },
  errorBox: {
    background: "#fff0f0",
    color: "#e74c3c",
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 13,
    marginTop: 10,
  },
  analyzeBtn: {
    width: "100%",
    padding: 15,
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    border: "none",
    borderRadius: 14,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 14,
    transition: "all 0.2s",
    letterSpacing: "0.3px",
  },
  loadRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  spinner: {
    width: 18,
    height: 18,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
  hint2: { textAlign: "center", fontSize: 11, color: "#ccc", marginTop: 8 },

  emotionCard: { borderRadius: 18, padding: "20px 22px" },
  emotionRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  bigEmoji2: { fontSize: 52, lineHeight: 1 },
  emotionInfo: { flex: 1 },
  emotionName: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "-0.5px",
    textTransform: "capitalize",
  },
  emotionMeta: { fontSize: 13, color: "#666", marginTop: 3 },
  scoreWrap: {
    position: "relative",
    width: 60,
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreInner: {
    position: "absolute",
    display: "flex",
    alignItems: "baseline",
    gap: 1,
  },
  scoreNum: { fontSize: 17, fontWeight: 800 },
  scoreDenom: { fontSize: 10, color: "#aaa" },
  insightRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 14,
    borderTop: "1px solid rgba(0,0,0,0.07)",
  },
  insightTxt: { margin: 0, fontSize: 14, color: "#444", lineHeight: 1.65 },

  whyCard: {
    background: "#fff",
    border: "1px solid #e0e7ff",
    borderRadius: 14,
    padding: "14px 16px",
  },
  whyHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  whyTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  whyText: { margin: 0, fontSize: 14, color: "#555", lineHeight: 1.6 },

  songsCard: {
    background: "#fff",
    border: "1px solid #f0f0f0",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },
  songsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 18px",
    borderBottom: "1px solid #f5f5f5",
    gap: 10,
    flexWrap: "wrap",
  },
  songsTitle: { fontSize: 15, fontWeight: 700, color: "#111" },
  songsSub: { fontSize: 12, color: "#888", marginTop: 2 },
  headerBtns: { display: "flex", gap: 6, flexShrink: 0 },
  lastfmBtn: {
    background: "#d51007",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  ytBtn: {
    background: "#FF0000",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },

  songList: { display: "flex", flexDirection: "column" },
  songRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    cursor: "pointer",
    background: "#fff",
    borderBottom: "1px solid #fafafa",
    transition: "background 0.15s",
  },
  songNum: {
    fontSize: 11,
    fontWeight: 700,
    minWidth: 22,
    fontFamily: "monospace",
    flexShrink: 0,
  },
  albumArt: {
    width: 40,
    height: 40,
    borderRadius: 6,
    objectFit: "cover",
    flexShrink: 0,
  },
  albumArtPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    flexShrink: 0,
  },
  songInfo: { flex: 1, minWidth: 0 },
  songName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#222",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  songArtist: { fontSize: 12, color: "#888", marginTop: 1 },
  songActions: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 },
  ytSongBtn: {
    background: "#FF0000",
    color: "#fff",
    width: 26,
    height: 26,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    textDecoration: "none",
    fontWeight: 700,
  },
  listenBtn: {
    background: "#f3f4f6",
    color: "#555",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    textDecoration: "none",
  },
  expandArrow: {
    fontSize: 9,
    cursor: "pointer",
    width: 16,
    textAlign: "center",
  },
  songWhyBox: {
    padding: "10px 14px 10px 52px",
    background: "#f8f7ff",
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    borderBottom: "1px solid #f0f0f0",
  },
  songWhyText: { fontSize: 13, color: "#555", lineHeight: 1.5 },
  noSongs: { padding: 20, textAlign: "center", color: "#999", fontSize: 14 },

  wellnessCard: {
    background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
    border: "1px solid #bbf7d0",
    borderRadius: 14,
    padding: "16px 18px",
  },
  wellnessHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  wellnessTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#166534",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  tipsList: { display: "flex", flexDirection: "column", gap: 8 },
  tipItem: { display: "flex", alignItems: "flex-start", gap: 10 },
  tipArrow: { fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 },
  tipText: { fontSize: 14, color: "#166534", lineHeight: 1.5 },

  feedbackCard: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 14,
    padding: "16px 20px",
    textAlign: "center",
  },
  feedbackQ: {
    margin: "0 0 12px",
    fontSize: 14,
    color: "#92400e",
    fontWeight: 600,
  },
  feedbackBtns: { display: "flex", gap: 10, justifyContent: "center" },
  yesBtn: {
    padding: "9px 22px",
    background: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: 20,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  },
  noBtn: {
    padding: "9px 22px",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: 20,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  },
  feedbackHint: { margin: "10px 0 0", fontSize: 11, color: "#b45309" },
  feedbackDone: {
    background: "#f0fdf4",
    color: "#166534",
    padding: "13px 16px",
    borderRadius: 12,
    fontSize: 14,
    textAlign: "center",
    fontWeight: 500,
  },
  patternAlert: {
    background: "#faf5ff",
    border: "1px solid #d8b4fe",
    borderRadius: 12,
    padding: "13px 16px",
    color: "#6b21a8",
    fontSize: 14,
  },
  newBtn: {
    padding: 13,
    background: "#f8f5ff",
    border: "1.5px solid #e9d5ff",
    borderRadius: 14,
    fontSize: 15,
    cursor: "pointer",
    fontWeight: 600,
    color: "#6b21a8",
    width: "100%",
    transition: "all 0.15s",
  },
};
