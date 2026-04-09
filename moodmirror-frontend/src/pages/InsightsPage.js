import React, { useState, useEffect } from "react";
import { getPatterns, getAnalytics } from "../services/api";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API = axios.create({ baseURL: "http://localhost:8080/api" });
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const EMOTION_COLORS = {
  HAPPY: "#F59E0B",
  SAD: "#3B82F6",
  ANXIOUS: "#8B5CF6",
  ANGRY: "#EF4444",
  CALM: "#10B981",
  EXCITED: "#F97316",
  TIRED: "#6B7280",
};

const EMOTION_EMOJI = {
  HAPPY: "😊",
  SAD: "😢",
  ANXIOUS: "😰",
  ANGRY: "😤",
  CALM: "😌",
  EXCITED: "🤩",
  TIRED: "😴",
};

function HeatmapCalendar({ data }) {
  if (!data || data.length === 0) return null;

  const getColor = (score, hasData) => {
    if (!hasData) return "#f0f0f0";
    if (score >= 8) return "#10B981";
    if (score >= 6) return "#6EE7B7";
    if (score >= 4) return "#FCD34D";
    if (score >= 2) return "#F87171";
    return "#EF4444";
  };

  // Group by weeks
  const weeks = [];
  let week = [];
  data.forEach((day, i) => {
    week.push(day);
    if (week.length === 7 || i === data.length - 1) {
      weeks.push([...week]);
      week = [];
    }
  });

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div>
      <div style={heatStyles.legendRow}>
        <span style={heatStyles.legendLabel}>Less</span>
        {["#f0f0f0", "#FCD34D", "#6EE7B7", "#10B981"].map((c, i) => (
          <div key={i} style={{ ...heatStyles.legendBox, background: c }} />
        ))}
        <span style={heatStyles.legendLabel}>More</span>
      </div>
      <div style={heatStyles.grid}>
        {weeks.map((week, wi) => (
          <div key={wi} style={heatStyles.weekCol}>
            {week.map((day, di) => (
              <div
                key={di}
                title={
                  day.hasData
                    ? `${day.date}: ${day.score}/10 (${day.count} entries)`
                    : day.date
                }
                style={{
                  ...heatStyles.cell,
                  background: getColor(day.score, day.hasData),
                  border: day.hasData
                    ? "1px solid rgba(0,0,0,0.08)"
                    : "1px solid #e8e8e8",
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={heatStyles.days}>
        {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => (
          <div key={i} style={heatStyles.dayLabel}>
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

const heatStyles = {
  grid: { display: "flex", gap: 3, overflowX: "auto", paddingBottom: 4 },
  weekCol: { display: "flex", flexDirection: "column", gap: 3 },
  cell: {
    width: 13,
    height: 13,
    borderRadius: 3,
    cursor: "pointer",
    transition: "transform 0.1s",
    flexShrink: 0,
  },
  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
    justifyContent: "flex-end",
  },
  legendBox: { width: 12, height: 12, borderRadius: 2 },
  legendLabel: { fontSize: 11, color: "#999" },
  days: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    position: "absolute",
    left: -28,
    top: 0,
  },
  dayLabel: {
    fontSize: 10,
    color: "#aaa",
    height: 13,
    display: "flex",
    alignItems: "center",
  },
};

export default function InsightsPage() {
  const [patterns, setPatterns] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    Promise.all([
      getPatterns(),
      getAnalytics(),
      API.get("/mood/stats"),
      API.get("/mood/heatmap"),
      API.get("/mood/weekly-report"),
    ])
      .then(([pRes, aRes, sRes, hRes, wRes]) => {
        setPatterns(pRes.data);
        setAnalytics(aRes.data);
        setStats(sRes.data);
        setHeatmap(hRes.data);
        setWeeklyReport(wRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner} />
        <p>Loading your insights...</p>
      </div>
    );

  const sections = [
    { id: "overview", label: "📊 Overview" },
    { id: "heatmap", label: "🗓 Calendar" },
    { id: "weekly", label: "📈 Weekly" },
    { id: "badges", label: "🏆 Badges" },
    { id: "patterns", label: "🔍 Patterns" },
  ];

  return (
    <div style={styles.container}>
      <style>{`@keyframes spin2{to{transform:rotate(360deg)}}`}</style>

      {/* Section tabs */}
      <div style={styles.sectionTabs}>
        {sections.map((s) => (
          <button
            key={s.id}
            style={{
              ...styles.sectionTab,
              ...(activeSection === s.id ? styles.sectionTabActive : {}),
            }}
            onClick={() => setActiveSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW ===== */}
      {activeSection === "overview" && (
        <div style={styles.section}>
          {/* Stats row */}
          <div style={styles.statsRow}>
            <StatCard
              icon="🔥"
              value={stats?.currentStreak || 0}
              label="Day Streak"
              color="#F97316"
            />
            <StatCard
              icon="📝"
              value={stats?.totalEntries || 0}
              label="Total Entries"
              color="#667eea"
            />
            <StatCard
              icon="⭐"
              value={stats?.overallAverage || 0}
              label="Avg Mood"
              color="#10B981"
            />
            <StatCard
              icon="🏆"
              value={stats?.longestStreak || 0}
              label="Best Streak"
              color="#F59E0B"
            />
          </div>

          {/* Week comparison */}
          {stats?.weekComparison && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>📅 This Week vs Last Week</div>
              <div style={styles.compRow}>
                <CompBox
                  label="This Week"
                  value={stats.weekComparison.thisWeek}
                  color="#667eea"
                />
                <div style={styles.compArrow}>
                  {stats.weekComparison.diff >= 0 ? "📈" : "📉"}
                  <div
                    style={{
                      ...styles.compDiff,
                      color:
                        stats.weekComparison.diff >= 0 ? "#10B981" : "#EF4444",
                    }}
                  >
                    {stats.weekComparison.diff >= 0 ? "+" : ""}
                    {stats.weekComparison.diff}
                  </div>
                </div>
                <CompBox
                  label="Last Week"
                  value={stats.weekComparison.lastWeek}
                  color="#9CA3AF"
                />
              </div>
            </div>
          )}

          {/* Best/worst days */}
          {stats?.bestDay && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>📆 Your Weekly Patterns</div>
              <div style={styles.dayRow}>
                <div style={styles.dayCard}>
                  <div style={styles.dayEmoji}>😊</div>
                  <div style={styles.dayLabel2}>Best Day</div>
                  <div style={styles.dayValue}>{stats.bestDay}</div>
                </div>
                <div style={styles.dayCard}>
                  <div style={styles.dayEmoji}>😔</div>
                  <div style={styles.dayLabel2}>Tough Day</div>
                  <div style={styles.dayValue}>{stats.worstDay}</div>
                </div>
                {stats.dominantEmotion && (
                  <div style={styles.dayCard}>
                    <div style={styles.dayEmoji}>
                      {EMOTION_EMOJI[stats.dominantEmotion] || "💭"}
                    </div>
                    <div style={styles.dayLabel2}>Most Felt</div>
                    <div style={styles.dayValue}>{stats.dominantEmotion}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mood timeline */}
          {analytics?.moodTimeline?.length > 1 && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>📈 Mood Timeline</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={[...analytics.moodTimeline].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[1, 10]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#667eea"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#667eea" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Emotion pie */}
          {analytics?.emotionFrequency?.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>💭 Emotion Mix</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={analytics.emotionFrequency}
                    dataKey="count"
                    nameKey="emotion"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={35}
                    label={({ emotion, percent }) =>
                      `${EMOTION_EMOJI[emotion] || ""} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {analytics.emotionFrequency.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={EMOTION_COLORS[entry.emotion] || "#ccc"}
                      />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) =>
                      `${EMOTION_EMOJI[value] || ""} ${value}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ===== HEATMAP ===== */}
      {activeSection === "heatmap" && (
        <div style={styles.section}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>🗓 90-Day Mood Calendar</div>
            <div style={styles.cardSub}>
              Each square is a day — hover to see your mood score
            </div>
            <div
              style={{ position: "relative", paddingLeft: 32, marginTop: 8 }}
            >
              <HeatmapCalendar data={heatmap} />
            </div>
            <div style={styles.heatmapLegend}>
              <div style={styles.heatLegendItem}>
                <div style={{ ...styles.heatDot, background: "#f0f0f0" }} /> No
                entry
              </div>
              <div style={styles.heatLegendItem}>
                <div style={{ ...styles.heatDot, background: "#FCD34D" }} /> Low
                mood
              </div>
              <div style={styles.heatLegendItem}>
                <div style={{ ...styles.heatDot, background: "#6EE7B7" }} />{" "}
                Good mood
              </div>
              <div style={styles.heatLegendItem}>
                <div style={{ ...styles.heatDot, background: "#10B981" }} />{" "}
                Great mood
              </div>
            </div>
          </div>

          {/* Day of week bar chart */}
          {analytics?.dayAverages?.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>📅 Average Mood by Day of Week</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={analytics.dayAverages}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
                    {analytics.dayAverages.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.avgScore >= 7
                            ? "#10B981"
                            : entry.avgScore >= 5
                              ? "#667eea"
                              : "#EF4444"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ===== WEEKLY REPORT ===== */}
      {activeSection === "weekly" && weeklyReport && (
        <div style={styles.section}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>📈 Weekly Mood Report</div>
            <div style={styles.weeklyGrid}>
              <WeeklyStatBox
                label="This Week Avg"
                value={`${weeklyReport.thisWeekAvg}/10`}
                color={
                  weeklyReport.trend === "IMPROVING"
                    ? "#10B981"
                    : weeklyReport.trend === "DECLINING"
                      ? "#EF4444"
                      : "#667eea"
                }
              />
              <WeeklyStatBox
                label="Last Week Avg"
                value={`${weeklyReport.lastWeekAvg}/10`}
                color="#9CA3AF"
              />
              <WeeklyStatBox
                label="Change"
                value={`${weeklyReport.difference >= 0 ? "+" : ""}${weeklyReport.difference}`}
                color={weeklyReport.difference >= 0 ? "#10B981" : "#EF4444"}
              />
              <WeeklyStatBox
                label="Entries"
                value={weeklyReport.thisWeekEntries}
                color="#667eea"
              />
            </div>

            {/* Trend badge */}
            <div
              style={{
                ...styles.trendBadge,
                background:
                  weeklyReport.trend === "IMPROVING"
                    ? "#D1FAE5"
                    : weeklyReport.trend === "DECLINING"
                      ? "#FEE2E2"
                      : "#EEF2FF",
              }}
            >
              <span style={{ fontSize: 20 }}>
                {weeklyReport.trend === "IMPROVING"
                  ? "📈"
                  : weeklyReport.trend === "DECLINING"
                    ? "📉"
                    : "➡️"}
              </span>
              <span
                style={{
                  ...styles.trendText,
                  color:
                    weeklyReport.trend === "IMPROVING"
                      ? "#065F46"
                      : weeklyReport.trend === "DECLINING"
                        ? "#991B1B"
                        : "#3730A3",
                }}
              >
                {weeklyReport.trend === "IMPROVING"
                  ? "Your mood is improving this week!"
                  : weeklyReport.trend === "DECLINING"
                    ? "A bit of a tough week — hang in there."
                    : "Stable week — consistency is good!"}
              </span>
            </div>
          </div>

          {/* Gemini weekly insight */}
          {weeklyReport.weeklyInsight && (
            <div style={styles.insightCard}>
              <div style={styles.insightHeader}>
                <span style={styles.insightStar}>✦</span>
                <span style={styles.insightTitle}>AI Weekly Insight</span>
              </div>
              <p style={styles.insightText}>{weeklyReport.weeklyInsight}</p>
            </div>
          )}

          {/* Best/worst day this week */}
          {weeklyReport.bestDay && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>This Week's Highlights</div>
              <div style={styles.dayRow}>
                <div style={{ ...styles.dayCard, background: "#F0FDF4" }}>
                  <div style={styles.dayEmoji}>🌟</div>
                  <div style={styles.dayLabel2}>Best Day</div>
                  <div style={styles.dayValue}>
                    {new Date(weeklyReport.bestDay).toLocaleDateString(
                      "en-IN",
                      { weekday: "short", day: "numeric", month: "short" },
                    )}
                  </div>
                  <div
                    style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}
                  >
                    {weeklyReport.bestScore}/10
                  </div>
                </div>
                {weeklyReport.worstDay && (
                  <div style={{ ...styles.dayCard, background: "#FFF7ED" }}>
                    <div style={styles.dayEmoji}>💪</div>
                    <div style={styles.dayLabel2}>Tough Day</div>
                    <div style={styles.dayValue}>
                      {new Date(weeklyReport.worstDay).toLocaleDateString(
                        "en-IN",
                        { weekday: "short", day: "numeric", month: "short" },
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#F97316",
                        fontWeight: 700,
                      }}
                    >
                      {weeklyReport.worstScore}/10
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emotion breakdown */}
          {weeklyReport.emotionBreakdown &&
            Object.keys(weeklyReport.emotionBreakdown).length > 0 && (
              <div style={styles.card}>
                <div style={styles.cardTitle}>This Week's Emotions</div>
                <div style={styles.emotionGrid}>
                  {Object.entries(weeklyReport.emotionBreakdown).map(
                    ([emotion, count]) => (
                      <div
                        key={emotion}
                        style={{
                          ...styles.emotionChip,
                          background: EMOTION_COLORS[emotion] + "20",
                          border: `1.5px solid ${EMOTION_COLORS[emotion]}40`,
                        }}
                      >
                        <span>{EMOTION_EMOJI[emotion] || "💭"}</span>
                        <span
                          style={{
                            ...styles.emotionChipName,
                            color: EMOTION_COLORS[emotion],
                          }}
                        >
                          {emotion}
                        </span>
                        <span style={styles.emotionChipCount}>×{count}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
        </div>
      )}

      {/* ===== BADGES ===== */}
      {activeSection === "badges" && stats?.badges && (
        <div style={styles.section}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>🏆 Achievement Badges</div>
            <div style={styles.cardSub}>Complete challenges to earn badges</div>
            <div style={styles.badgeGrid}>
              {stats.badges.map((badge, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.badgeCard,
                    opacity: badge.earned ? 1 : 0.4,
                    background: badge.earned ? "#fff" : "#f8f8f8",
                    border: badge.earned
                      ? "2px solid #667eea20"
                      : "1px solid #e8e8e8",
                    transform: badge.earned ? "scale(1)" : "scale(0.97)",
                  }}
                >
                  <div style={styles.badgeIcon}>{badge.icon}</div>
                  <div style={styles.badgeName}>{badge.name}</div>
                  <div style={styles.badgeDesc}>{badge.description}</div>
                  {badge.earned && (
                    <div style={styles.badgeEarned}>✓ Earned</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Streak display */}
          <div
            style={{
              ...styles.card,
              background:
                stats.currentStreak > 0
                  ? "linear-gradient(135deg, #FFF7ED, #FED7AA)"
                  : "#fff",
              border:
                stats.currentStreak > 0
                  ? "1px solid #FCD34D"
                  : "1px solid #f0f0f0",
            }}
          >
            <div style={styles.streakDisplay}>
              <span style={styles.streakFire}>
                {stats.currentStreak > 0 ? "🔥" : "💤"}
              </span>
              <div>
                <div style={styles.streakNumber}>
                  {stats.currentStreak} day
                  {stats.currentStreak !== 1 ? "s" : ""}
                </div>
                <div style={styles.streakLabel}>current streak</div>
              </div>
              <div style={styles.streakBest}>
                <div style={styles.streakBestNum}>🏆 {stats.longestStreak}</div>
                <div style={styles.streakBestLabel}>best streak</div>
              </div>
            </div>
            {stats.currentStreak === 0 && (
              <p style={styles.streakCta}>
                Log your mood today to start a streak!
              </p>
            )}
          </div>
        </div>
      )}

      {/* ===== PATTERNS ===== */}
      {activeSection === "patterns" && (
        <div style={styles.section}>
          {patterns.length === 0 ? (
            <div style={styles.noPatterns}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
              <h3 style={{ margin: "0 0 8px", color: "#581c87" }}>
                Patterns forming...
              </h3>
              <p style={{ color: "#6b21a8", margin: 0 }}>
                Log at least 5 moods to unlock pattern detection. You're at{" "}
                <strong>{analytics?.totalEntries || 0}</strong> entries.
              </p>
              <div style={styles.progressBarOuter}>
                <div
                  style={{
                    ...styles.progressBarInner,
                    width: `${Math.min(100, (analytics?.totalEntries || 0) * 20)}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            patterns.map((p) => (
              <div key={p.id} style={styles.patternCard}>
                <div style={styles.patternType}>
                  {p.patternType.replace("_", " ")}
                </div>
                <p style={styles.patternDesc}>{p.description}</p>
                <div style={styles.confRow}>
                  <span style={styles.confLabel}>Confidence</span>
                  <div style={styles.confBarOuter}>
                    <div
                      style={{
                        ...styles.confBarInner,
                        width: `${p.confidence * 100}%`,
                      }}
                    />
                  </div>
                  <span style={styles.confPct}>
                    {Math.round(p.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Helper components
function StatCard({ icon, value, label, color }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function CompBox({ label, value, color }) {
  return (
    <div style={styles.compBox}>
      <div style={{ ...styles.compValue, color }}>{value}/10</div>
      <div style={styles.compLabel}>{label}</div>
    </div>
  );
}

function WeeklyStatBox({ label, value, color }) {
  return (
    <div style={styles.weeklyStatBox}>
      <div style={{ ...styles.weeklyStatValue, color }}>{value}</div>
      <div style={styles.weeklyStatLabel}>{label}</div>
    </div>
  );
}

const styles = {
  container: { maxWidth: 680, margin: "0 auto", padding: "0 16px" },
  loading: {
    textAlign: "center",
    padding: 60,
    color: "#888",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  loadingSpinner: {
    width: 32,
    height: 32,
    border: "3px solid #e0e0e0",
    borderTopColor: "#667eea",
    borderRadius: "50%",
    animation: "spin2 0.8s linear infinite",
  },

  sectionTabs: { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" },
  sectionTab: {
    padding: "8px 14px",
    border: "1.5px solid #e8e8e8",
    borderRadius: 20,
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    color: "#666",
    transition: "all 0.15s",
  },
  sectionTabActive: {
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    border: "1.5px solid transparent",
    fontWeight: 700,
  },

  section: { display: "flex", flexDirection: "column", gap: 16 },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    border: "1px solid #f0f0f0",
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 4 },
  cardSub: { fontSize: 13, color: "#888", marginBottom: 14 },

  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  statCard: {
    background: "#fff",
    borderRadius: 14,
    padding: "16px 12px",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    border: "1px solid #f0f0f0",
  },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" },
  statLabel: { fontSize: 11, color: "#999", marginTop: 2, fontWeight: 500 },

  compRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    padding: "12px 0",
  },
  compBox: { textAlign: "center" },
  compValue: { fontSize: 28, fontWeight: 800, letterSpacing: "-1px" },
  compLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  compArrow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    fontSize: 28,
  },
  compDiff: { fontSize: 16, fontWeight: 700 },

  dayRow: { display: "flex", gap: 12, marginTop: 10 },
  dayCard: {
    flex: 1,
    background: "#fafafa",
    borderRadius: 12,
    padding: "14px",
    textAlign: "center",
  },
  dayEmoji: { fontSize: 24, marginBottom: 6 },
  dayLabel2: {
    fontSize: 11,
    color: "#888",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  dayValue: { fontSize: 14, fontWeight: 700, color: "#333" },

  heatmapLegend: { display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" },
  heatLegendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#666",
  },
  heatDot: { width: 12, height: 12, borderRadius: 3 },

  weeklyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    marginBottom: 16,
  },
  weeklyStatBox: {
    background: "#fafafa",
    borderRadius: 12,
    padding: "14px 10px",
    textAlign: "center",
  },
  weeklyStatValue: { fontSize: 20, fontWeight: 800 },
  weeklyStatLabel: { fontSize: 11, color: "#888", marginTop: 2 },
  trendBadge: {
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  trendText: { fontSize: 14, fontWeight: 600 },

  insightCard: {
    background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
    border: "1px solid #ddd6fe",
    borderRadius: 16,
    padding: "20px",
  },
  insightHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  insightStar: { color: "#7c3aed", fontSize: 16 },
  insightTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#7c3aed",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  insightText: { margin: 0, color: "#4c1d95", fontSize: 15, lineHeight: 1.7 },

  emotionGrid: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 },
  emotionChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 20,
  },
  emotionChipName: { fontSize: 13, fontWeight: 600 },
  emotionChipCount: { fontSize: 12, color: "#666" },

  badgeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    marginTop: 10,
  },
  badgeCard: {
    borderRadius: 14,
    padding: "16px 10px",
    textAlign: "center",
    transition: "all 0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  badgeIcon: { fontSize: 28, marginBottom: 6 },
  badgeName: { fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 4 },
  badgeDesc: { fontSize: 10, color: "#888", lineHeight: 1.4 },
  badgeEarned: {
    fontSize: 10,
    color: "#667eea",
    fontWeight: 700,
    marginTop: 6,
  },

  streakDisplay: { display: "flex", alignItems: "center", gap: 16 },
  streakFire: { fontSize: 48 },
  streakNumber: {
    fontSize: 32,
    fontWeight: 800,
    color: "#F97316",
    letterSpacing: "-1px",
  },
  streakLabel: { fontSize: 13, color: "#888" },
  streakBest: { marginLeft: "auto", textAlign: "center" },
  streakBestNum: { fontSize: 18, fontWeight: 700, color: "#F59E0B" },
  streakBestLabel: { fontSize: 11, color: "#888" },
  streakCta: {
    margin: "12px 0 0",
    fontSize: 13,
    color: "#F97316",
    textAlign: "center",
  },

  patternCard: {
    background: "#fff",
    border: "1px solid #f0f0f0",
    borderRadius: 14,
    padding: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
  },
  patternType: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: "#667eea",
    marginBottom: 6,
  },
  patternDesc: {
    margin: "0 0 10px",
    fontSize: 14,
    color: "#374151",
    lineHeight: 1.6,
  },
  confRow: { display: "flex", alignItems: "center", gap: 8 },
  confLabel: { fontSize: 11, color: "#888", minWidth: 70 },
  confBarOuter: {
    flex: 1,
    background: "#e5e7eb",
    borderRadius: 10,
    height: 5,
    overflow: "hidden",
  },
  confBarInner: { background: "#667eea", height: "100%", borderRadius: 10 },
  confPct: { fontSize: 11, color: "#667eea", fontWeight: 700, minWidth: 30 },

  noPatterns: {
    background: "#faf5ff",
    border: "1px solid #e9d5ff",
    borderRadius: 16,
    padding: "32px 24px",
    textAlign: "center",
  },
  progressBarOuter: {
    background: "#e9d5ff",
    borderRadius: 20,
    height: 8,
    overflow: "hidden",
    margin: "16px auto 0",
    maxWidth: 200,
  },
  progressBarInner: {
    background: "#7c3aed",
    height: "100%",
    borderRadius: 20,
    transition: "width 0.5s",
  },
};
