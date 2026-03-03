import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SERVER } from '../api';

export default function Dashboard({ onViewAnalytics, onBack }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    axios.get(`${SERVER}/meetings`)
      .then(r => setMeetings(r.data.meetings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
                <span className={`dashboard-card-status ${m.isLive ? 'live' : 'ended'}`}>
                  {m.isLive ? 'Live' : m.endedAt ? 'Ended' : 'Created'}
                </span>
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
                    color: m.avgEngagement >= 60 ? '#34a853' : m.avgEngagement >= 30 ? '#f9ab00' : 'rgba(255,255,255,.4)',
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
