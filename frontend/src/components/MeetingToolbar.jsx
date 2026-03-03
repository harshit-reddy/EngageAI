import React, { useState } from 'react';
import { REACTIONS } from '../utils/constants';
import useIsMobile from '../hooks/useIsMobile';
import ToolbarOverflow from './ToolbarOverflow';

export default function MeetingToolbar({
  isMuted, isVideoOff, toggleMute, toggleVideo,
  showWhiteboard, onToggleWhiteboard,
  showTranscript, onToggleTranscript,
  isScreenSharing, onToggleScreenShare,
  handRaised, onToggleHand,
  onReaction,
  isHost, onOpenMonitor, onStartAnalysis, onStopAnalysis, monitoringEnabled,
  onSendFeedback,
  onLeave, onEndSession,
  showPeople, onTogglePeople,
  showChat, onToggleChat,
  participantCount, unreadChat,
}) {
  const [showReactions, setShowReactions] = useState(false);
  const isMobile = useIsMobile();

  /* Secondary buttons — shown directly on desktop, inside overflow on mobile */
  const secondaryButtons = (
    <>
      {/* Screen share */}
      <ToolBtn onClick={onToggleScreenShare} active={isScreenSharing}
        title="Share screen" label="Share">
        <ScreenIcon />
      </ToolBtn>

      {/* Raise hand */}
      <ToolBtn onClick={onToggleHand} active={handRaised}
        highlight={handRaised} title="Raise hand" label="Hand">
        <span style={{ fontSize: 18 }}>{'\u270B'}</span>
      </ToolBtn>

      {/* Reactions */}
      <div style={{ position: 'relative' }}>
        <ToolBtn onClick={() => setShowReactions(v => !v)}
          active={showReactions} title="Reactions" label="React">
          <span style={{ fontSize: 18 }}>{'\u{1F600}'}</span>
        </ToolBtn>
        {showReactions && (
          <div className="reaction-popup">
            {REACTIONS.map(r => (
              <button key={r.emoji} className="reaction-btn"
                title={r.label} aria-label={r.label}
                onClick={() => { onReaction(r.emoji); setShowReactions(false); }}>
                {r.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Whiteboard */}
      <ToolBtn onClick={onToggleWhiteboard} active={showWhiteboard}
        title="Whiteboard" label="Board">
        <BoardIcon />
      </ToolBtn>

      {/* Transcript */}
      <ToolBtn onClick={onToggleTranscript} active={showTranscript}
        title="Transcript" label="Captions">
        <TranscriptIcon />
      </ToolBtn>

      {/* Host: Start Analysis */}
      {onStartAnalysis && (
        <ToolBtn onClick={onStartAnalysis} title="Start real-time ML analysis" label="Analysis"
          highlight>
          <AnalyticsIcon />
        </ToolBtn>
      )}

      {/* Host: Stop Analysis */}
      {onStopAnalysis && (
        <ToolBtn onClick={onStopAnalysis} stop title="Stop analysis" label="Stop">
          <StopIcon />
        </ToolBtn>
      )}

      {/* Host: Open Monitor */}
      {onOpenMonitor && (
        <ToolBtn onClick={onOpenMonitor} active title="Open monitor view" label="Monitor">
          <AnalyticsIcon />
        </ToolBtn>
      )}

      {/* Participant: Feedback */}
      {onSendFeedback && (
        <ToolBtn onClick={onSendFeedback} title="Send feedback" label="Feedback">
          <FeedbackIcon />
        </ToolBtn>
      )}

      {/* Host: End */}
      {isHost && onEndSession && (
        <ToolBtn onClick={onEndSession} danger title="End for everyone" label="End">
          <EndIcon />
        </ToolBtn>
      )}
    </>
  );

  return (
    <div className="toolbar-wrapper">
      <div className="meeting-toolbar">
        {/* Mic — always visible */}
        <ToolBtn onClick={toggleMute} active={isMuted} title={isMuted ? 'Unmute' : 'Mute'}
          label={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <MicOffIcon /> : <MicOnIcon />}
        </ToolBtn>

        {/* Camera — always visible */}
        <ToolBtn onClick={toggleVideo} active={isVideoOff}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          label={isVideoOff ? 'Camera on' : 'Camera off'}>
          {isVideoOff ? <VideoOffIcon /> : <VideoOnIcon />}
        </ToolBtn>

        {isMobile ? (
          <>
            {/* Chat — always visible on mobile */}
            <ToolBtn onClick={onToggleChat} active={showChat}
              title="Meeting chat" label="Chat"
              badge={unreadChat > 0 ? unreadChat : null} badgeType="alert">
              <ChatIcon />
            </ToolBtn>

            {/* People — always visible on mobile */}
            <ToolBtn onClick={onTogglePeople} active={showPeople}
              title="Show participants" label="People"
              badge={participantCount > 0 ? participantCount : null}>
              <PeopleIcon />
            </ToolBtn>

            {/* More — overflow menu on mobile */}
            <ToolbarOverflow>
              {secondaryButtons}
            </ToolbarOverflow>

            {/* Leave — always visible */}
            <ToolBtn onClick={onLeave} danger title="Leave meeting" label="Leave">
              <LeaveIcon />
            </ToolBtn>
          </>
        ) : (
          <>
            {/* Screen share */}
            <ToolBtn onClick={onToggleScreenShare} active={isScreenSharing}
              title="Share screen" label="Share">
              <ScreenIcon />
            </ToolBtn>

            <div className="toolbar-divider" />

            {/* People */}
            <ToolBtn onClick={onTogglePeople} active={showPeople}
              title="Show participants" label="People"
              badge={participantCount > 0 ? participantCount : null}>
              <PeopleIcon />
            </ToolBtn>

            {/* Chat */}
            <ToolBtn onClick={onToggleChat} active={showChat}
              title="Meeting chat" label="Chat"
              badge={unreadChat > 0 ? unreadChat : null} badgeType="alert">
              <ChatIcon />
            </ToolBtn>

            <div className="toolbar-divider" />

            {/* Raise hand */}
            <ToolBtn onClick={onToggleHand} active={handRaised}
              highlight={handRaised} title="Raise hand" label="Hand">
              <span style={{ fontSize: 18 }}>{'\u270B'}</span>
            </ToolBtn>

            {/* Reactions */}
            <div style={{ position: 'relative' }}>
              <ToolBtn onClick={() => setShowReactions(v => !v)}
                active={showReactions} title="Reactions" label="React">
                <span style={{ fontSize: 18 }}>{'\u{1F600}'}</span>
              </ToolBtn>
              {showReactions && (
                <div className="reaction-popup">
                  {REACTIONS.map(r => (
                    <button key={r.emoji} className="reaction-btn"
                      title={r.label} aria-label={r.label}
                      onClick={() => { onReaction(r.emoji); setShowReactions(false); }}>
                      {r.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="toolbar-divider" />

            {/* Whiteboard */}
            <ToolBtn onClick={onToggleWhiteboard} active={showWhiteboard}
              title="Whiteboard" label="Board">
              <BoardIcon />
            </ToolBtn>

            {/* Transcript */}
            <ToolBtn onClick={onToggleTranscript} active={showTranscript}
              title="Transcript" label="Captions">
              <TranscriptIcon />
            </ToolBtn>

            {/* Host: Start Analysis */}
            {onStartAnalysis && (
              <ToolBtn onClick={onStartAnalysis} title="Start real-time ML analysis" label="Analysis"
                highlight>
                <AnalyticsIcon />
              </ToolBtn>
            )}

            {/* Host: Stop Analysis */}
            {onStopAnalysis && (
              <ToolBtn onClick={onStopAnalysis} stop title="Stop analysis" label="Stop">
                <StopIcon />
              </ToolBtn>
            )}

            {/* Host: Open Monitor */}
            {onOpenMonitor && (
              <ToolBtn onClick={onOpenMonitor} active title="Open monitor view" label="Monitor">
                <AnalyticsIcon />
              </ToolBtn>
            )}

            {/* Participant: Feedback */}
            {onSendFeedback && (
              <ToolBtn onClick={onSendFeedback} title="Send feedback" label="Feedback">
                <FeedbackIcon />
              </ToolBtn>
            )}

            <div className="toolbar-divider" />

            {/* Leave */}
            <ToolBtn onClick={onLeave} danger title="Leave meeting" label="Leave">
              <LeaveIcon />
            </ToolBtn>

            {/* Host: End */}
            {isHost && onEndSession && (
              <ToolBtn onClick={onEndSession} danger title="End for everyone" label="End">
                <EndIcon />
              </ToolBtn>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ToolBtn({ onClick, active, danger, highlight, stop, children, title, label, badge, badgeType }) {
  return (
    <button onClick={onClick}
      className={`tool-btn ${active ? 'active' : ''} ${danger ? 'danger' : ''} ${highlight ? 'highlight' : ''} ${stop ? 'stop' : ''}`}
      title={title}
      aria-label={title}>
      <span className="tool-btn-icon">
        {children}
        {badge != null && (
          <span className={badgeType === 'alert' ? 'badge-alert' : 'badge-count'}>
            {badge}
          </span>
        )}
      </span>
      {label && <span className="tool-btn-label">{label}</span>}
    </button>
  );
}

/* ── SVG Icons ── */
const MicOnIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </svg>
);
const MicOffIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);
const VideoOnIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25z" />
  </svg>
);
const VideoOffIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25z" />
    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);
const ScreenIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
  </svg>
);
const PeopleIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
const ChatIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
  </svg>
);
const BoardIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487z" />
  </svg>
);
const TranscriptIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);
const AnalyticsIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);
const FeedbackIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  </svg>
);
const LeaveIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
);
const StopIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="6" y="6" width="12" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const EndIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
