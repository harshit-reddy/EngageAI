import React from 'react';

export default function WaitingLobby({ meetingId, onLeave }) {
  return (
    <div className="lobby-page">
      <div className="lobby-card">
        <div className="lobby-logo">EngageAI</div>
        <div className="spinner" />
        <h2 className="lobby-title">Waiting for host to let you in</h2>
        <p className="lobby-sub">Meeting ID: <span className="lobby-meeting-id">{meetingId}</span></p>
        <p className="lobby-hint">You'll be admitted once the host approves your request.</p>
        <button className="btn-secondary lobby-leave-btn" onClick={onLeave}>Leave</button>
      </div>
    </div>
  );
}
