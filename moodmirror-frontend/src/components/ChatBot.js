import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:8080/api" });
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const QUICK_REPLIES = [
  "I'm feeling really stressed 😰",
  "I just need to vent",
  "Why do I feel sad for no reason?",
  "Help me calm down",
  "I'm feeling better today! 😊",
  "What patterns have you noticed?",
];

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!started) {
      setStarted(true);
      API.get("/chat/starter")
        .then((res) => {
          setMessages([
            {
              id: 1,
              role: "bot",
              content: res.data.message,
              time: new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
          setUnread(1);
        })
        .catch(() => {
          setMessages([
            {
              id: 1,
              role: "bot",
              content:
                "Hi! I'm your MoodMirror companion. I'm here to listen. How are you feeling today?",
              time: new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
          setUnread(1);
        });
    }
  }, [started]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");

    const time = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const userMsg = { id: Date.now(), role: "user", content: msg, time };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const history = messages.slice(-10).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    try {
      const res = await API.post("/chat/message", { message: msg, history });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          content: res.data.reply,
          time,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          content:
            "I'm having trouble connecting right now. Try again in a moment?",
          time,
        },
      ]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div>
      <style>{`
        @keyframes mmFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes mmDot{0%,80%,100%{opacity:0;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}
        @keyframes mmSpin{to{transform:rotate(360deg)}}
        .mm-fab:hover{transform:scale(1.08)!important;}
        .mm-chip:hover{background:#667eea!important;color:#fff!important;}
        .mm-send:hover{background:#5a67d8!important;}
        .mm-row:hover{background:#f5f3ff!important;}
      `}</style>

      {/* FAB Button */}
      <div
        className="mm-fab"
        onClick={() => setIsOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#667eea,#764ba2)",
          boxShadow: "0 4px 20px rgba(102,126,234,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 1000,
          transition: "transform 0.2s",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 24 }}>{isOpen ? "✕" : "💬"}</span>
        {!isOpen && unread > 0 && (
          <div
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#EF4444",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #fff",
            }}
          >
            {unread}
          </div>
        )}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            right: 28,
            width: 340,
            height: 520,
            borderRadius: 20,
            background: "#fff",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            zIndex: 999,
            overflow: "hidden",
            animation: "mmFadeUp 0.3s ease",
            border: "1px solid rgba(102,126,234,0.12)",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg,#667eea,#764ba2)",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                🪞
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
                  MoodMirror AI
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 2,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#4ade80",
                    }}
                  />
                  <span
                    style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}
                  >
                    Always here for you
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => {
                  setMessages([]);
                  setStarted(false);
                }}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#fff",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ↺
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#fff",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "#f8f7ff",
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 6,
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {msg.role === "bot" && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: "linear-gradient(135deg,#667eea,#764ba2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                    }}
                  >
                    🪞
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "10px 13px",
                    borderRadius: 16,
                    ...(msg.role === "user"
                      ? {
                          background: "linear-gradient(135deg,#667eea,#764ba2)",
                          color: "#fff",
                          borderBottomRightRadius: 4,
                        }
                      : {
                          background: "#fff",
                          color: "#333",
                          borderBottomLeftRadius: 4,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                          border: "1px solid #f0eeff",
                        }),
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </p>
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.55,
                      marginTop: 4,
                      textAlign: "right",
                    }}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 6,
                  justifyContent: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#667eea,#764ba2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  🪞
                </div>
                <div
                  style={{
                    background: "#fff",
                    padding: "12px 16px",
                    borderRadius: 16,
                    borderBottomLeftRadius: 4,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                    border: "1px solid #f0eeff",
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#c4b5fd",
                        animation: `mmDot 1.2s ease infinite`,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && (
            <div
              style={{
                padding: "8px 10px",
                display: "flex",
                flexWrap: "wrap",
                gap: 5,
                borderTop: "1px solid #f0eeff",
                background: "#fff",
                flexShrink: 0,
              }}
            >
              {QUICK_REPLIES.map((qr, i) => (
                <button
                  key={i}
                  className="mm-chip"
                  onClick={() => sendMessage(qr)}
                  style={{
                    background: "#f5f3ff",
                    border: "1px solid #e9d5ff",
                    color: "#6b21a8",
                    padding: "5px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: 500,
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              padding: "10px 12px",
              background: "#fff",
              borderTop: "1px solid #f0eeff",
              flexShrink: 0,
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type how you're feeling..."
              style={{
                flex: 1,
                border: "1.5px solid #e8e0ff",
                borderRadius: 12,
                padding: "9px 12px",
                fontSize: 14,
                fontFamily: "inherit",
                resize: "none",
                background: "#faf8ff",
                color: "#333",
                maxHeight: 80,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
            <button
              className="mm-send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#667eea",
                color: "#fff",
                border: "none",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s",
                fontWeight: 700,
                opacity: !input.trim() || loading ? 0.5 : 1,
              }}
            >
              ↑
            </button>
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: 10,
              color: "#ccc",
              padding: "0 12px 8px",
              background: "#fff",
            }}
          >
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatBot;
