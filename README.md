# 🪞 MoodMirror — Personalized Music Therapy Through Emotional Intelligence

> A full-stack AI-powered web application that detects your emotional state, recommends real music matched to your mood, explains the science behind each recommendation, and learns your behavioral patterns over time.

---

## 📸 Features

- 🧠 **Emotion Detection** — Type how you feel in any language. Gemini AI detects HAPPY, SAD, ANXIOUS, ANGRY, CALM, EXCITED, or TIRED with a mood score (1–10)
- 🎵 **Real Music Recommendations** — Live songs fetched from Last.fm API with album art, artist name, and YouTube Music links
- 💡 **Explainable AI** — Every song recommendation comes with a science-backed reason. Click any song to see "Why this song fits your mood"
- 🌿 **Wellness Tips** — Beyond music — actionable mental wellness suggestions for each emotion
- 📊 **Pattern Intelligence** — After 5+ entries, Java detects your weekly and hourly mood patterns automatically
- 🔮 **Predictive Nudges** — Quartz Scheduler runs hourly and sends proactive playlists before your mood dips
- 🗓 **90-Day Mood Heatmap** — GitHub-style calendar showing your emotional history
- 📈 **Weekly Reports** — This week vs last week comparison with AI-generated insights
- 🏆 **Badges & Streaks** — Achievement system to encourage consistent mood logging
- 💬 **Context-Aware Chatbot** — AI companion that greets you with your mood history context

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Recharts, Axios, React Router DOM |
| Backend | Java 17, Spring Boot 3.5 |
| Database | MySQL 8+ |
| AI | Google Gemini API (free tier) |
| Music | Last.fm API (free) |
| Auth | JWT + Spring Security + BCrypt |
| Scheduler | Quartz Scheduler |
| HTTP Client | Spring WebFlux (WebClient) |
---

## ⚙️ Setup & Installation

### Prerequisites

- Java 17+
- Node.js 18+
- MySQL 8+
- Maven 3.8+

---

### Step 1 — Get Free API Keys

**Google Gemini (Free)**
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google → Create API Key
3. Copy the key

**Last.fm (Free)**
1. Go to https://www.last.fm/api/account/create
2. Create account → Fill form → Submit
3. Copy the API Key

---

### Step 2 — Configure Backend

Open `backend/src/main/resources/application.properties`:

```properties
# MySQL — change password to your local MySQL password
spring.datasource.url=jdbc:mysql://localhost:3306/moodmirror?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD

# Gemini AI API
gemini.api.key=YOUR_GEMINI_API_KEY
gemini.api.url=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent

# Last.fm API
lastfm.api.key=YOUR_LASTFM_API_KEY

# JWT Secret
jwt.secret=moodmirror-super-secret-key-2024
jwt.expiration=86400000
```

---

### Step 3 — Run Backend

```bash
cd backend
mvn spring-boot:run
```

Backend starts at: `http://localhost:8080`

MySQL database and all tables are **auto-created** on first run.

---

### Step 4 — Run Frontend

```bash
cd frontend
npm install
npm start
```

Frontend starts at: `http://localhost:3000`

---

## 🗄️ Database Schema

### users
| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | Auto-generated |
| username | VARCHAR | Unique username |
| email | VARCHAR | Unique email |
| password | VARCHAR | BCrypt encoded |
| preferred_genres | VARCHAR | Learned over time |
| avg_mood_score | DOUBLE | Running average |
| total_entries | INT | Count of mood logs |

### mood_entries
| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | Auto-generated |
| user_id | BIGINT FK | References users |
| raw_input | TEXT | What user typed |
| detected_emotion | VARCHAR | HAPPY/SAD/ANXIOUS etc. |
| mood_score | INT | 1–10 |
| energy_level | VARCHAR | LOW/MEDIUM/HIGH |
| context_tag | VARCHAR | WORK/STUDY/PERSONAL etc. |
| day_of_week | INT | ⭐ 1=Mon to 7=Sun (for pattern queries) |
| hour_of_day | INT | ⭐ 0–23 (for pattern queries) |
| playlist_id | VARCHAR | Last.fm reference |
| music_helped | BOOLEAN | User feedback |
| created_at | DATETIME | Timestamp |

### mood_patterns
| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | Auto-generated |
| user_id | BIGINT FK | References users |
| pattern_type | VARCHAR | WEEKLY_LOW/TIME_BASED/CONTEXT_TRIGGER |
| description | TEXT | Human-readable pattern |
| confidence | DOUBLE | 0.0 to 1.0 |
| is_active | BOOLEAN | Current validity |
| detected_at | DATETIME | When found |

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login, get JWT |

### Mood
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/mood/log | Log mood, get songs |
| POST | /api/mood/{id}/feedback | Rate if music helped |
| GET | /api/mood/history | Past mood entries |
| GET | /api/mood/patterns | Detected patterns |
| GET | /api/mood/analytics | Chart data |
| GET | /api/mood/stats | Streak, badges, comparison |
| GET | /api/mood/heatmap | 90-day calendar data |
| GET | /api/mood/weekly-report | Weekly AI report |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/chat/starter | Personalized opening message |
| POST | /api/chat/message | Send message, get AI reply |

### Nudge
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/nudge | Poll for predictive nudge |

---

## 🧠 How Mood Score is Calculated

**Step 1 — Gemini AI Analysis**

User input is sent to Gemini with this prompt structure:
```
Analyze this mood input and return JSON:
{
  "detectedEmotion": "HAPPY|SAD|ANXIOUS|ANGRY|CALM|EXCITED|TIRED",
  "moodScore": <1-10>,
  "energyLevel": "LOW|MEDIUM|HIGH",
  "contextTag": "WORK|STUDY|PERSONAL|HEALTH|SOCIAL|OTHER"
}
moodScore rules: 1=very bad, 5=neutral, 10=excellent
```

Gemini reads emotional intensity from words like "super", "very", "extremely", "a bit" to assign the score.

**Step 2 — Keyword Fallback (when API quota exceeded)**

```java
if contains "happy"/"great"/"amazing"  → HAPPY, score 8
if contains "sad"/"low marks"/"fail"   → SAD, score 3
if contains "stress"/"anxious"/"worry" → ANXIOUS, score 4
if contains "tired"/"exhausted"        → TIRED, score 4
if contains "angry"/"frustrated"       → ANGRY, score 3
```

This ensures the system never fails regardless of API availability.

---

## 🔍 Pattern Detection Algorithm

```
Every 5 mood entries:
1. Query: SELECT day_of_week, AVG(mood_score) GROUP BY day_of_week
2. Find the lowest scoring day
3. Calculate overall average
4. If lowest_day_avg < overall_avg - 1.0 → Pattern flagged
5. Gemini generates human-readable description
6. Pattern saved to mood_patterns table
```

Same logic applied for hour_of_day and context_tag patterns.

---

## 🔮 Predictive Nudge Engine

```
Every 1 hour (Quartz Scheduler):
1. Get current day_of_week and hour_of_day
2. For each user with 10+ entries:
   a. Fetch all entries for this same day
   b. Calculate average mood for this day
   c. Compare with overall average
   d. If this_day_avg < overall_avg - 1.0:
      → Generate proactive Gemini message
      → Store in pendingNudges map
3. Frontend polls /api/nudge every 10 minutes
4. Nudge displayed as banner before mood dips
```

---

## 💬 Context-Aware Chatbot — How It Works

```
User opens chat → /api/chat/starter called
  → Java fetches last 10 mood entries from MySQL
  → Builds mood context string:
     "User's recent history:
      - 2026-03-23: ANXIOUS (score 4/10)
      - 2026-03-22: SAD (score 3/10)
      ..."
  → Injects into Gemini system prompt
  → Bot responds with personalized greeting

Every message → /api/chat/message called
  → Mood context + conversation history sent to Gemini
  → Gemini responds as a personal companion, not generic chatbot
```

---

## 🏆 Achievement Badges

| Badge | Requirement |
|-------|-------------|
| 🌱 First Step | Log first mood entry |
| 🔥 3-Day Streak | Log mood 3 days in a row |
| ⚡ Week Warrior | Log mood 7 days in a row |
| 💎 Consistency King | Log mood 30 days in a row |
| 📝 Getting Started | Log 5 total moods |
| 🎯 Dedicated | Log 25 total moods |
| 🏆 MoodMaster | Log 100 total moods |
| 🎵 Music Critic | Rate 10 playlists |

> *"MoodMirror remembers you. And in mental wellness, being remembered matters."* 🪞
