import React, { useState, useRef, useEffect } from 'react';

export default function ChatPanel({
  messages, onSend, onClose, localName, localSid,
  dmTarget, dmMessages, onSendDm, onClearDm,
}) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const isDm = !!dmTarget;

  const visibleDmMessages = isDm
    ? dmMessages.filter(m =>
        (m.fromSid === localSid && m.toSid === dmTarget.sid) ||
        (m.fromSid === dmTarget.sid && m.toSid === localSid)
      )
    : [];

  const displayMessages = isDm ? visibleDmMessages : messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length]);

  function handleSend() {
    if (!text.trim()) return;
    if (isDm) onSendDm(text.trim());
    else onSend(text.trim());
    setText('');
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isDm && (
            <button className="dm-back-btn" onClick={onClearDm} title="Back to group chat">
              &larr;
            </button>
          )}
          <h3>{isDm ? dmTarget.name : 'Chat'}</h3>
          {isDm && <span className="dm-badge">DM</span>}
        </div>
        <button className="side-panel-close" onClick={onClose}>&times;</button>
      </div>

      <div className="side-panel-body chat-messages">
        {displayMessages.length === 0 && (
          <div className="chat-empty">
            {isDm ? `No messages with ${dmTarget.name} yet.` : 'No messages yet. Say something!'}
          </div>
        )}
        {displayMessages.map(m => {
          const isMe = isDm ? m.fromSid === localSid : m.name === localName;
          const senderName = isDm ? m.fromName : m.name;
          return (
            <div key={m.id} className={`chat-msg ${isMe ? 'self' : ''}`}>
              <div className="chat-msg-header">
                <span className="chat-msg-name">{senderName}</span>
                <span className="chat-msg-time">
                  {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="chat-msg-text">{m.text}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <input
          className="chat-input"
          placeholder={isDm ? `Message ${dmTarget.name}...` : 'Type a message...'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!text.trim()}>
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}
