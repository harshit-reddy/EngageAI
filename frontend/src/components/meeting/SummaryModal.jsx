import React from 'react';

export default function SummaryModal({ summary, onClose }) {
  if (!summary) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-enter summary-modal">
        <h2 className="summary-title">Session Summary</h2>

        <div className="summary-stats">
          <div className="summary-stat-card">
            <div className="stat-label">Duration</div>
            <div className="stat-value">{Math.floor(summary.duration / 60)}m {summary.duration % 60}s</div>
          </div>
          <div className="summary-stat-card">
            <div className="stat-label">Participants</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{summary.participantCount}</div>
          </div>
          <div className="summary-stat-card">
            <div className="stat-label">Avg Engagement</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{summary.overallEngagement}%</div>
          </div>
        </div>

        {summary.participants?.length > 0 && (
          <>
            <h3 className="summary-section-title">Participant Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {summary.participants.map(p => (
                <div key={p.name} className="summary-participant">
                  <span className="summary-p-name">{p.name}</span>
                  <div className="summary-p-stats">
                    <span style={{ color: p.avgEngagement >= 60 ? 'var(--green)' : 'var(--yellow)' }}>
                      {p.avgEngagement}% avg
                    </span>
                    <span style={{ color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                      {p.dominantEmotion}
                    </span>
                    {p.focusedPct != null && (
                      <span style={{ color: 'var(--green)', fontSize: 12 }}>
                        Focus: {p.focusedPct}%
                      </span>
                    )}
                    {p.drowsinessIncidents > 0 && (
                      <span style={{ color: 'var(--red)', fontSize: 12 }}>
                        Drowsy: {p.drowsinessIncidents}x
                      </span>
                    )}
                    {p.talkTimeMs > 0 && (
                      <span style={{ color: 'var(--green)', fontSize: 12 }}>
                        Talk: {Math.round(p.talkTimeMs / 1000)}s
                      </span>
                    )}
                    {p.awayTimeMs > 0 && (
                      <span style={{ color: 'var(--yellow)', fontSize: 12 }}>
                        Away: {Math.round(p.awayTimeMs / 1000)}s
                      </span>
                    )}
                    {p.visibleTimeMs > 0 && (
                      <span style={{ color: 'var(--green)', fontSize: 12 }}>
                        Visible: {Math.round(p.visibleTimeMs / 1000)}s
                      </span>
                    )}
                    {p.listeningTimeMs > 0 && (
                      <span style={{ color: 'var(--accent)', fontSize: 12 }}>
                        Listening: {Math.round(p.listeningTimeMs / 1000)}s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {summary.transcript?.length > 0 && (
          <>
            <h3 className="summary-section-title">Meeting Transcript</h3>
            <div className="summary-transcript">
              {summary.transcript.map((line, i) => (
                <div key={i} className="summary-transcript-line">
                  <strong style={{ color: 'var(--accent)' }}>{line.name}:</strong> {line.text}
                </div>
              ))}
            </div>
          </>
        )}

        <button onClick={onClose} className="home-btn" style={{ width: '100%' }}>
          Close &amp; Return Home
        </button>
      </div>
    </div>
  );
}
