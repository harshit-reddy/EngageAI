import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function PreJoinScreen({ meetingId, userName, meetingName, onJoin, onBack }) {
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Attach stream to video element whenever stream or ref changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Cleanup on unmount (only if user goes back, not on join)
  const joinedRef = useRef(false);
  useEffect(() => {
    return () => {
      if (!joinedRef.current && streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const acquireStream = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = s;
      setStream(s);
      return s;
    } catch {
      setError('Camera/microphone access denied. Please allow permissions.');
      return null;
    }
  }, []);

  async function toggleCamera() {
    if (isVideoOff) {
      // Turning camera ON
      const s = await acquireStream();
      if (!s) return;
      s.getVideoTracks().forEach(t => { t.enabled = true; });
      setIsVideoOff(false);
    } else {
      // Turning camera OFF
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(t => { t.enabled = false; });
      }
      setIsVideoOff(true);
    }
  }

  async function toggleMic() {
    if (isMuted) {
      // Turning mic ON
      const s = await acquireStream();
      if (!s) return;
      s.getAudioTracks().forEach(t => { t.enabled = true; });
      setIsMuted(false);
    } else {
      // Turning mic OFF
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
      }
      setIsMuted(true);
    }
  }

  async function handleJoin() {
    const s = await acquireStream();
    if (!s) return;
    // Apply final track states
    s.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    s.getVideoTracks().forEach(t => { t.enabled = !isVideoOff; });
    joinedRef.current = true;
    onJoin(s, isMuted, isVideoOff);
  }

  function handleBack() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    onBack();
  }

  return (
    <div className="prejoin-page">
      <div className="prejoin-card">
        {meetingName && <h2 className="prejoin-meeting-name">{meetingName}</h2>}
        <div className="prejoin-meta">
          <span className="prejoin-id">Meeting ID: {meetingId}</span>
          <span className="prejoin-user">Joining as <strong>{userName}</strong></span>
        </div>

        <div className="prejoin-preview">
          <video
            ref={videoRef}
            autoPlay muted playsInline
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: isVideoOff ? 'none' : 'block',
            }}
          />
          {isVideoOff && (
            <div className="prejoin-avatar">
              <div className="avatar-circle">{initials}</div>
            </div>
          )}
        </div>

        {error && <div className="prejoin-error">{error}</div>}

        <div className="prejoin-controls">
          <button
            className={`prejoin-toggle ${isMuted ? 'off' : 'on'}`}
            onClick={toggleMic}
            title={isMuted ? 'Turn on microphone' : 'Turn off microphone'}
          >
            {isMuted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            )}
            <span>{isMuted ? 'Mic off' : 'Mic on'}</span>
          </button>

          <button
            className={`prejoin-toggle ${isVideoOff ? 'off' : 'on'}`}
            onClick={toggleCamera}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            )}
            <span>{isVideoOff ? 'Camera off' : 'Camera on'}</span>
          </button>
        </div>

        <button className="prejoin-join-btn" onClick={handleJoin}>
          Join now
        </button>
        <button className="prejoin-back-btn" onClick={handleBack}>
          Go back
        </button>
      </div>
    </div>
  );
}
