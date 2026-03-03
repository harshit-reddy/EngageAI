import React from 'react';
import { formatTime } from '../../utils/formatTime';

export default function MeetingHeader({
  meetingId, meetingName, elapsed, connected, monitoringEnabled,
  participantCount, inviteUrl, copied, onCopyInvite,
}) {
  return (
    <div className="meeting-header">
      <div className="meeting-header-left">
        <span className="meeting-logo">EngageAI</span>
        {meetingName && <span className="meeting-name">{meetingName}</span>}
        <span className="meeting-id-badge">{meetingId}</span>
        <span className="meeting-timer">{formatTime(elapsed)}</span>
        {connected && (
          <span className="meeting-live">
            <span className="live-dot" /> LIVE
          </span>
        )}
        {monitoringEnabled && (
          <span className="meeting-analyzing">
            <span className="analyzing-dot" /> Analyzing
          </span>
        )}
        <span className="meeting-count">{participantCount} in meeting</span>
      </div>
      <div className="meeting-header-right">
        <div className="invite-section">
          <span className="invite-url">{inviteUrl}</span>
          <button className="btn-copy" onClick={onCopyInvite} aria-label="Copy invite link">
            {copied ? 'Copied!' : 'Copy Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
