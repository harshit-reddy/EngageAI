import React, { useRef, useEffect } from 'react';

export default function TranscriptPanel({ lines, onClose }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines.length]);

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <h3>Transcript</h3>
        {onClose && (
          <button className="side-panel-close" onClick={onClose} aria-label="Close transcript">&times;</button>
        )}
      </div>
      <div className="side-panel-body" aria-live="polite" aria-label="Live transcript">
        {(!lines || lines.length === 0) ? (
          <div className="chat-empty">Waiting for transcript lines...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lines.map((line, i) => (
              <div key={i} className="transcript-line">
                <span className="transcript-speaker">{line.name}</span>
                <span className="transcript-text">{line.text}</span>
                <span className="transcript-time">{new Date(line.ts).toLocaleTimeString()}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
