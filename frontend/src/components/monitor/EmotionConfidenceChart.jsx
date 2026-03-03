import React from 'react';

const EMOTION_COLORS = {
  happy: '#34a853', sad: '#4285f4', neutral: '#9aa0a6',
  surprised: '#f9ab00', angry: '#ea4335', fearful: '#7b1fa2',
  disgusted: '#795548', focused: '#00bcd4', confused: '#ff9800',
};

export default function EmotionConfidenceChart({ scores, currentEmotion }) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return (
    <div className="emotion-bars">
      {sorted.map(([emotion, score]) => (
        <div key={emotion} className={`emotion-bar-row ${emotion === currentEmotion ? 'active' : ''}`}>
          <span className="emotion-bar-name">{emotion}</span>
          <div className="emotion-bar-track">
            <div
              className="emotion-bar-fill"
              style={{
                width: `${Math.max(2, score * 100)}%`,
                background: EMOTION_COLORS[emotion] || '#9aa0a6',
              }}
            />
          </div>
          <span className="emotion-bar-val">{Math.round(score * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
