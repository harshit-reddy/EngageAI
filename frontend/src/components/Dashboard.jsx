import React, { useEffect, useState } from 'react';
import { SERVER, authAxios } from '../api';

export default function Dashboard({ onViewAnalytics, onBack }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    authAxios.get(`${SERVER}/meetings`)
      .then(r => setMeetings(r.data.meetings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm('Delete this meeting and its analytics permanently?')) return;
    try {
      await authAxios.delete(`${SERVER}/meetings/${id}`);
      setMeetings(prev => prev.filter(m => m.id !== id));
    } catch {}
  }

  const filtered = meetings.filter(m => {
    if (filter === 'active') return m.isLive;
    if (filter === 'past') return m.endedAt != null;
    return true;
  });

  const fmtDate = ts => ts ? new Date(ts).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  }) : '\u2014';

  const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  }) : '';

  const fmtDuration = (start, end) => {
    if (!start) return '\u2014';
    const ms = (end || Date.now()) - start;
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const totalMeetings = meetings.length;
  const liveMeetings = meetings.filter(m => m.isLive).length;
  const avgEng = meetings.length
    ? Math.round(meetings.reduce((s, m) => s + (m.avgEngagement || 0), 0) / meetings.length)
    : 0;

  return (
    <div className="dashboard-page">
      <div className="dashboard-topbar">
        <div className="dashboard-topbar-left">
          <button className="detail-back" onClick={onBack}>&larr; Home</button>
          <h2 className="dashboard-page-title">Meeting Dashboard</h2>
        </div>
        <div className="dashboard-filter-tabs">
          {['all', 'active', 'past'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`dashboard-filter-btn ${filter === f ? 'active' : ''}`}>
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Past'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="dashboard-summary-strip">
        <div className="dash-summary-item">
          <span className="dash-summary-val">{totalMeetings}</span>
          <span className="dash-summary-lbl">Total</span>
        </div>
        <div className="dash-summary-item">
          <span className="dash-summary-val dash-live">{liveMeetings}</span>
          <span className="dash-summary-lbl">Live Now</span>
        </div>
        <div className="dash-summary-item">
          <span className="dash-summary-val" style={{
            color: avgEng >= 60 ? '#34d399' : avgEng >= 30 ? '#fbbf24' : 'rgba(255,255,255,.4)',
          }}>{avgEng}%</span>
          <span className="dash-summary-lbl">Avg Engagement</span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="dashboard-empty">
          {filter === 'all'
            ? 'No meetings yet. Start a meeting to see it here.'
            : `No ${filter} meetings.`}
        </div>
      ) : (
        <div className="dashboard-grid">
          {filtered.map(m => (
            <div key={m.id}
              className={`dashboard-card ${m.hasAnalytics ? 'clickable' : ''}`}
              onClick={() => m.hasAnalytics && onViewAnalytics(m.id)}>
              <div className="dashboard-card-header">
                <span className="dashboard-card-id">{m.id}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={`dashboard-card-status ${m.isLive ? 'live' : 'ended'}`}>
                    {m.isLive ? 'Live' : m.endedAt ? 'Ended' : 'Created'}
                  </span>
                  <button className="dashboard-delete-btn" title="Delete meeting"
                    onClick={(e) => handleDelete(e, m.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              {m.meetingName && <div className="dashboard-card-name">{m.meetingName}</div>}
              <div className="dashboard-card-host">{m.hostName}</div>
              <div className="dashboard-card-meta">
                <span>{fmtDate(m.createdAt)} {fmtTime(m.createdAt)}</span>
                <span>{fmtDuration(m.createdAt, m.endedAt)}</span>
              </div>
              <div className="dashboard-card-stats">
                <div className="dashboard-stat">
                  <span className="dashboard-stat-val">{m.participantCount}</span>
                  <span className="dashboard-stat-label">Participants</span>
                </div>
                <div className="dashboard-stat">
                  <span className="dashboard-stat-val" style={{
                    color: m.avgEngagement >= 60 ? '#34d399' : m.avgEngagement >= 30 ? '#fbbf24' : 'rgba(255,255,255,.4)',
                  }}>
                    {m.hasAnalytics ? `${m.avgEngagement}%` : '\u2014'}
                  </span>
                  <span className="dashboard-stat-label">Engagement</span>
                </div>
              </div>
              {m.hasAnalytics && (
                <div className="dashboard-card-footer">View Analytics &rarr;</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
