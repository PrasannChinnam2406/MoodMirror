import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { checkNudge } from "../services/api";
import MoodLogger from "../components/MoodLogger";
import InsightsPage from "./InsightsPage";
import HistoryPage from "./HistoryPage";
import ChatBot from "../components/ChatBot";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("log");
  const [nudge, setNudge] = useState(null);

  useEffect(() => {
    const pollNudge = async () => {
      try {
        const res = await checkNudge();
        if (res.data.hasNudge) setNudge(res.data.nudge);
      } catch (e) {}
    };
    pollNudge();
    const interval = setInterval(pollNudge, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const tabs = [
    { id: "log", icon: "✦", label: "Log Mood" },
    { id: "insights", icon: "◈", label: "Insights" },
    { id: "history", icon: "▤", label: "History" },
  ];

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        body { background: #f4f2ff; margin: 0; }
        .tab-btn:hover { background: rgba(102,126,234,0.08) !important; }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoArea}>
            <div style={styles.logoIcon}>🪞</div>
            <div>
              <div style={styles.logoText}>MoodMirror</div>
              <div style={styles.logoSub}>emotional intelligence</div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.userBadge}>
              <div style={styles.userAvatar}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <span style={styles.userName}>Hi, {user?.username}</span>
            </div>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Nudge banner */}
      {nudge && (
        <div style={styles.nudgeBanner}>
          <span style={styles.nudgePill}>🔮 Pattern Detected</span>
          <p style={styles.nudgeText}>{nudge}</p>
          <button style={styles.nudgeClose} onClick={() => setNudge(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Nav */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className="tab-btn"
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {}),
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={styles.tabIcon}>{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && <div style={styles.tabUnderline} />}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main style={styles.main}>
        {activeTab === "log" && <MoodLogger />}
        {activeTab === "insights" && <InsightsPage />}
        {activeTab === "history" && <HistoryPage />}
      </main>

      {/* Floating ChatBot — always visible on all tabs */}
      <ChatBot />
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f4f2ff" },
  header: {
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(102,126,234,0.12)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
  },
  logoArea: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: { fontSize: 28 },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1a1a2e",
    letterSpacing: "-0.5px",
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: 10,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f4f2ff",
    padding: "6px 12px",
    borderRadius: 20,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
  },
  userName: { fontSize: 14, fontWeight: 600, color: "#444" },
  logoutBtn: {
    background: "none",
    border: "1.5px solid #e0e0e0",
    color: "#888",
    padding: "6px 14px",
    borderRadius: 20,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  },
  nudgeBanner: {
    background: "linear-gradient(135deg, #fdf4ff, #fae8ff)",
    borderBottom: "1px solid #e9d5ff",
    padding: "12px 24px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  nudgePill: {
    background: "#9333ea",
    color: "#fff",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  nudgeText: {
    margin: 0,
    flex: 1,
    color: "#581c87",
    fontSize: 14,
    lineHeight: 1.5,
  },
  nudgeClose: {
    background: "none",
    border: "none",
    color: "#9333ea",
    cursor: "pointer",
    fontSize: 18,
  },
  nav: {
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid #f0eeff",
    position: "sticky",
    top: 64,
    zIndex: 99,
  },
  navInner: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    gap: 4,
  },
  tabBtn: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "14px 18px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    color: "#999",
    borderRadius: 10,
    transition: "all 0.15s",
  },
  tabBtnActive: { color: "#667eea", fontWeight: 700 },
  tabIcon: { fontSize: 14 },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "60%",
    height: 2.5,
    background: "linear-gradient(90deg, #667eea, #764ba2)",
    borderRadius: 2,
  },
  main: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "32px 20px",
    paddingBottom: 100,
  },
};
