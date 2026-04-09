import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = isLogin
        ? await login({ username: form.username, password: form.password })
        : await register(form);
      loginUser(res.data.token, {
        username: res.data.username,
        email: res.data.email,
        totalEntries: res.data.totalEntries,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
        body { margin: 0; }
        input:focus { outline: none; border-color: #667eea !important; box-shadow: 0 0 0 3px rgba(102,126,234,0.15) !important; }
        .auth-input { transition: all 0.2s; }
        .switch-btn:hover { color: #667eea; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Background orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.orb3} />

      <div style={styles.card}>
        {/* Left panel */}
        <div style={styles.leftPanel}>
          <div
            style={{
              animation: "float 4s ease-in-out infinite",
              fontSize: 56,
              marginBottom: 16,
            }}
          >
            🪞
          </div>
          <h1 style={styles.brandName}>MoodMirror</h1>
          <p style={styles.brandTagline}>
            Your emotional intelligence companion
          </p>
          <div style={styles.featureList}>
            {[
              ["✦", "Detects your emotion from free text"],
              ["◈", "Discovers your mood patterns over time"],
              ["♪", "Curates music that actually helps you"],
              ["🔮", "Predicts your mood before it hits"],
            ].map(([icon, text]) => (
              <div key={text} style={styles.featureItem}>
                <span style={styles.featureIcon}>{icon}</span>
                <span style={styles.featureText}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={styles.rightPanel}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>
              {isLogin ? "Welcome back" : "Get started"}
            </h2>
            <p style={styles.formSub}>
              {isLogin ? "Sign in to your account" : "Create your free account"}
            </p>
          </div>

          <div style={styles.tabSwitch}>
            <button
              style={{
                ...styles.switchTab,
                ...(isLogin ? styles.switchTabActive : {}),
              }}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              style={{
                ...styles.switchTab,
                ...(!isLogin ? styles.switchTabActive : {}),
              }}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Username</label>
              <input
                className="auth-input"
                style={styles.input}
                placeholder="your_username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            {!isLogin && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Email</label>
                <input
                  className="auth-input"
                  style={styles.input}
                  placeholder="you@example.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            )}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <input
                className="auth-input"
                style={styles.input}
                placeholder="••••••••"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <button
              style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Sign In →"
                  : "Create Account →"}
            </button>
          </form>

          <p style={styles.switchText}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              className="switch-btn"
              style={styles.switchLink}
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f0c29",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  orb1: {
    position: "fixed",
    top: "-20%",
    left: "-10%",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(102,126,234,0.4), transparent 70%)",
    pointerEvents: "none",
  },
  orb2: {
    position: "fixed",
    bottom: "-20%",
    right: "-10%",
    width: 600,
    height: 600,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(118,75,162,0.4), transparent 70%)",
    pointerEvents: "none",
  },
  orb3: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    width: 800,
    height: 400,
    borderRadius: "50%",
    background:
      "radial-gradient(ellipse, rgba(102,126,234,0.08), transparent 70%)",
    pointerEvents: "none",
  },

  card: {
    display: "flex",
    maxWidth: 860,
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
    position: "relative",
    zIndex: 1,
  },

  leftPanel: {
    flex: 1,
    background: "linear-gradient(160deg, #667eea 0%, #764ba2 100%)",
    padding: "48px 36px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 32,
    fontWeight: 800,
    color: "#fff",
    margin: "0 0 8px",
    letterSpacing: "-1px",
  },
  brandTagline: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    marginBottom: 32,
  },
  featureList: { display: "flex", flexDirection: "column", gap: 14 },
  featureItem: { display: "flex", alignItems: "center", gap: 12 },
  featureIcon: { fontSize: 16, color: "rgba(255,255,255,0.9)", width: 24 },
  featureText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    lineHeight: 1.4,
  },

  rightPanel: {
    flex: 1,
    background: "#fff",
    padding: "48px 40px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  formHeader: { marginBottom: 24 },
  formTitle: {
    fontSize: 26,
    fontWeight: 800,
    color: "#111",
    margin: "0 0 4px",
    letterSpacing: "-0.5px",
  },
  formSub: { color: "#888", fontSize: 14 },

  tabSwitch: {
    display: "flex",
    background: "#f5f5f5",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  switchTab: {
    flex: 1,
    padding: "9px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    color: "#888",
    borderRadius: 8,
    transition: "all 0.2s",
  },
  switchTabActive: {
    background: "#fff",
    color: "#667eea",
    fontWeight: 700,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },

  form: { display: "flex", flexDirection: "column", gap: 16 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#555" },
  input: {
    padding: "12px 14px",
    border: "1.5px solid #e8e8e8",
    borderRadius: 10,
    fontSize: 15,
    fontFamily: "inherit",
    background: "#fafafa",
  },
  errorBox: {
    background: "#fff0f0",
    color: "#e74c3c",
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 13,
  },
  submitBtn: {
    padding: "14px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 4,
    letterSpacing: "0.3px",
  },

  switchText: {
    textAlign: "center",
    fontSize: 13,
    color: "#888",
    marginTop: 20,
  },
  switchLink: {
    background: "none",
    border: "none",
    color: "#667eea",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    padding: 0,
    transition: "color 0.2s",
  },
};
