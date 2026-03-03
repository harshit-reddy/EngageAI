import React from 'react';

export default function AdminPanel({
  name, setName, meetingName, setMeetingName,
  busy, error, clearErr,
  onRequestStart, onViewDashboard, onAdminLogout, onKey,
}) {
  return (
    <>
      <div className="admin-header">
        <div>
          <h2 className="home-card-title">Admin Panel</h2>
          <p className="home-card-sub">Create meetings and view analytics.</p>
        </div>
        <button className="admin-logout-btn" onClick={onAdminLogout}>Logout</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="home-label" htmlFor="admin-name">Your Name</label>
          <input id="admin-name" className="home-input" type="text" placeholder="Enter your name"
            value={name} onChange={e => { setName(e.target.value); clearErr(); }}
            onKeyDown={e => onKey(e, onRequestStart)} />
        </div>

        <div>
          <label className="home-label" htmlFor="meeting-name">Meeting Name</label>
          <input id="meeting-name" className="home-input" type="text"
            placeholder="e.g. Sprint Review, Team Standup"
            value={meetingName} onChange={e => { setMeetingName(e.target.value); clearErr(); }}
            onKeyDown={e => onKey(e, onRequestStart)} />
        </div>

        {error && <div className="home-error" role="alert">{error}</div>}

        <button className="home-btn" disabled={busy}
          style={{ opacity: busy ? 0.6 : 1 }}
          onClick={onRequestStart}>
          {busy ? 'Creating...' : 'Start New Meeting'}
        </button>

        <div className="admin-divider"><span>or</span></div>

        <button className="home-btn-outline" onClick={onViewDashboard}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: 8 }}>
            <rect x="1" y="8" width="3" height="7" rx="1" fill="currentColor" opacity=".6"/>
            <rect x="5" y="5" width="3" height="10" rx="1" fill="currentColor" opacity=".8"/>
            <rect x="9" y="2" width="3" height="13" rx="1" fill="currentColor"/>
            <rect x="13" y="6" width="3" height="9" rx="1" fill="currentColor" opacity=".6"/>
          </svg>
          View Dashboard
        </button>
      </div>
    </>
  );
}
