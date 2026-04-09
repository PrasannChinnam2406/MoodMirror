import React, { useState, useEffect } from 'react';
import { getMoodHistory } from '../services/api';

const EMOTION_EMOJI = {
  HAPPY: '😊', SAD: '😢', ANXIOUS: '😰', ANGRY: '😤',
  CALM: '😌', EXCITED: '🤩', TIRED: '😴'
};

const SCORE_COLOR = (score) => {
  if (score >= 8) return '#10b981';
  if (score >= 5) return '#f59e0b';
  return '#ef4444';
};

export default function HistoryPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMoodHistory(50)
      .then(res => setEntries(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.loading}>Loading your mood history...</div>;

  if (entries.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={{ fontSize: 48 }}>📭</div>
        <p>No mood entries yet. Start by logging how you feel!</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Your Mood Journal</h2>
      <p style={styles.subtitle}>{entries.length} entries logged</p>
      {entries.map(entry => (
        <div key={entry.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.emoji}>{EMOTION_EMOJI[entry.detectedEmotion] || '💭'}</span>
            <div style={styles.headerInfo}>
              <div style={styles.emotion}>{entry.detectedEmotion}</div>
              <div style={styles.meta}>{entry.contextTag} · {entry.energyLevel} energy</div>
            </div>
            <div style={{ ...styles.scoreBadge, background: SCORE_COLOR(entry.moodScore) }}>
              {entry.moodScore}/10
            </div>
          </div>

          <p style={styles.rawInput}>"{entry.rawInput}"</p>

          {entry.insight && (
            <p style={styles.insight}>✨ {entry.insight}</p>
          )}

          <div style={styles.cardFooter}>
            <span style={styles.playlist}>🎵 {entry.playlistName}</span>
            {entry.musicHelped !== null && (
              <span style={styles.musicFeedback}>
                {entry.musicHelped ? '👍 Music helped' : '👎 Music didn\'t help'}
              </span>
            )}
            <span style={styles.date}>{new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: { maxWidth: 640, margin: '0 auto', padding: '0 16px' },
  loading: { textAlign: 'center', padding: 40, color: '#888' },
  empty: { textAlign: 'center', padding: 40, color: '#888' },
  heading: { fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 20 },
  card: { background: '#fff', border: '1px solid #f0f0f0', borderRadius: 14, padding: '16px 18px', marginBottom: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 },
  emoji: { fontSize: 32 },
  headerInfo: { flex: 1 },
  emotion: { fontWeight: 700, color: '#1a1a2e', fontSize: 16 },
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  scoreBadge: { color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 700 },
  rawInput: { margin: '0 0 8px', color: '#555', fontSize: 14, fontStyle: 'italic', lineHeight: 1.5 },
  insight: { margin: '0 0 10px', color: '#6b21a8', fontSize: 13, background: '#faf5ff', padding: '8px 12px', borderRadius: 8 },
  cardFooter: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  playlist: { fontSize: 12, color: '#15803d', background: '#f0fdf4', padding: '3px 10px', borderRadius: 20 },
  musicFeedback: { fontSize: 12, color: '#666' },
  date: { marginLeft: 'auto', fontSize: 12, color: '#aaa' }
};
