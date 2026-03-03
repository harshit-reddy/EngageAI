import React from 'react';

export default function ParticipantPanel({
  participants, localSid, isHost,
  speakingPeers, onMuteParticipant, onMuteAll, onClose, onDm,
}) {
  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <h3>People ({participants.length})</h3>
        <button className="side-panel-close" onClick={onClose}>&times;</button>
      </div>

      <div className="side-panel-body">
        {participants.map(p => {
          const isMe = p.id === localSid;
          const isSpeaking = speakingPeers.has(p.id);
          const initials = (p.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

          return (
            <div key={p.id} className={`participant-row ${isSpeaking ? 'speaking' : ''}`}>
              <div className="participant-avatar-sm">{initials}</div>
              <div className="participant-info">
                <span className="participant-name-text">
                  {p.name}{isMe ? ' (You)' : ''}
                </span>
                {p.role === 'speaker' && <span className="host-badge">Host</span>}
              </div>
              <div className="participant-status-icons">
                {p.handRaised && <span className="status-hand-sm" title="Hand raised">{'\u270B'}</span>}
                {!isMe && onDm && (
                  <button className="dm-btn-sm" onClick={() => onDm(p)} title={`Message ${p.name}`}>
                    <ChatSmIcon />
                  </button>
                )}
                <span className={`media-icon ${p.isVideoOff ? 'off' : 'on'}`}
                  title={p.isVideoOff ? 'Camera off' : 'Camera on'}>
                  <CamIcon off={p.isVideoOff} />
                </span>
                <span className={`media-icon ${p.isMuted ? 'off' : 'on'}`}
                  title={p.isMuted ? 'Muted' : 'Unmuted'}>
                  <MicIcon off={p.isMuted} />
                </span>
                {isHost && !isMe && !p.isMuted && (
                  <button className="mute-btn-sm"
                    onClick={() => onMuteParticipant(p.id)}
                    title="Mute this participant">
                    Mute
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isHost && participants.filter(p => p.id !== localSid).length > 0 && (
        <div className="side-panel-footer">
          <button className="mute-all-btn" onClick={onMuteAll}>
            Mute All Participants
          </button>
        </div>
      )}
    </div>
  );
}

function ChatSmIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

function MicIcon({ off }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      {off && <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

function CamIcon({ off }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25z" />
      {off && <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}
