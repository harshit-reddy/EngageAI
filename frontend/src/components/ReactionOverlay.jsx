import React, { useState, useEffect, useRef } from 'react';

/**
 * Floating emoji reactions that appear and animate upward.
 * reactions: array pushed externally via addReaction()
 */
export default function ReactionOverlay({ reactions }) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 80, left: 0, right: 0,
      pointerEvents: 'none', zIndex: 30, overflow: 'hidden', height: 300,
    }}>
      {reactions.map(r => (
        <FloatingEmoji key={r.id} emoji={r.emoji} name={r.name} />
      ))}
    </div>
  );
}

function FloatingEmoji({ emoji, name }) {
  const [style, setStyle] = useState({
    position: 'absolute',
    bottom: 0,
    left: `${20 + Math.random() * 60}%`,
    fontSize: 36,
    opacity: 1,
    transition: 'all 3s ease-out',
    textAlign: 'center',
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      setStyle(prev => ({
        ...prev,
        bottom: 280,
        opacity: 0,
        transform: `translateX(${(Math.random() - 0.5) * 60}px)`,
      }));
    });
  }, []);

  return (
    <div style={style}>
      <div>{emoji}</div>
      <div style={{ fontSize: 10, color: '#5f6368', marginTop: 2 }}>{name}</div>
    </div>
  );
}
