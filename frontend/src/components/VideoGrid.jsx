import React, { useEffect, useRef, useState } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import {
  FACE_OVAL, LEFT_EYE, RIGHT_EYE, LEFT_EYEBROW, RIGHT_EYEBROW,
  LIPS_OUTER, LIPS_INNER, LEFT_IRIS, RIGHT_IRIS, NOSE,
  TESSELATION, KEY_POINTS,
} from '../utils/faceMeshConnections';

/* ── helpers ─────────────────────────────────────────────────────── */
function px(pt, mirrored, w, h) {
  return [mirrored ? (1 - pt.x) * w : pt.x * w, pt.y * h];
}

function drawEdges(ctx, lm, edges, color, lineW, mirrored, w, h) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.beginPath();
  for (const [a, b] of edges) {
    if (!lm[a] || !lm[b]) continue;
    const [x1, y1] = px(lm[a], mirrored, w, h);
    const [x2, y2] = px(lm[b], mirrored, w, h);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
}

/* ── Full face-mesh overlay ──────────────────────────────────────── */
function FaceLandmarkOverlay({ landmarks, mirrored }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    if (!landmarks || landmarks.length === 0) return;

    const lm = landmarks;

    // ── Layer 1: Tesselation mesh (faint green lines) ──
    drawEdges(ctx, lm, TESSELATION, 'rgba(0,255,170,0.18)', 0.7, mirrored, w, h);

    // ── Layer 2: All 478 mesh dots ──
    ctx.fillStyle = 'rgba(0,255,170,0.3)';
    for (const pt of lm) {
      const [x, y] = px(pt, mirrored, w, h);
      ctx.beginPath();
      ctx.arc(x, y, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Layer 3: Face oval (brighter outline) ──
    ctx.shadowColor = 'rgba(0,255,170,0.3)';
    ctx.shadowBlur = 4;
    drawEdges(ctx, lm, FACE_OVAL, 'rgba(0,255,170,0.55)', 1.2, mirrored, w, h);
    ctx.shadowBlur = 0;

    // ── Layer 4: Nose bridge ──
    drawEdges(ctx, lm, NOSE, 'rgba(0,255,170,0.5)', 1, mirrored, w, h);

    // ── Layer 5: Eyes (blue glow) ──
    ctx.shadowColor = 'rgba(0,150,255,0.5)';
    ctx.shadowBlur = 6;
    drawEdges(ctx, lm, LEFT_EYE, 'rgba(0,180,255,0.85)', 1.5, mirrored, w, h);
    drawEdges(ctx, lm, RIGHT_EYE, 'rgba(0,180,255,0.85)', 1.5, mirrored, w, h);
    ctx.shadowBlur = 0;

    // ── Layer 6: Eyebrows (orange) ──
    drawEdges(ctx, lm, LEFT_EYEBROW, 'rgba(255,170,0,0.7)', 1.3, mirrored, w, h);
    drawEdges(ctx, lm, RIGHT_EYEBROW, 'rgba(255,170,0,0.7)', 1.3, mirrored, w, h);

    // ── Layer 7: Lips (pink/magenta glow) ──
    ctx.shadowColor = 'rgba(255,50,120,0.4)';
    ctx.shadowBlur = 5;
    drawEdges(ctx, lm, LIPS_OUTER, 'rgba(255,80,140,0.8)', 1.4, mirrored, w, h);
    drawEdges(ctx, lm, LIPS_INNER, 'rgba(255,80,140,0.6)', 1, mirrored, w, h);
    ctx.shadowBlur = 0;

    // ── Layer 8: Iris (bright cyan glow) ──
    if (lm.length > 477) {
      ctx.shadowColor = 'rgba(0,230,255,0.8)';
      ctx.shadowBlur = 8;
      drawEdges(ctx, lm, LEFT_IRIS, 'rgba(0,230,255,0.95)', 1.5, mirrored, w, h);
      drawEdges(ctx, lm, RIGHT_IRIS, 'rgba(0,230,255,0.95)', 1.5, mirrored, w, h);
      // Iris center dots
      ctx.fillStyle = 'rgba(0,230,255,1)';
      [468, 473].forEach(i => {
        if (!lm[i]) return;
        const [x, y] = px(lm[i], mirrored, w, h);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }

    // ── Layer 9: Key structural points (large glowing dots) ──
    ctx.shadowColor = 'rgba(0,255,200,0.7)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(0,255,200,0.9)';
    for (const i of KEY_POINTS) {
      if (!lm[i]) continue;
      const [x, y] = px(lm[i], mirrored, w, h);
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, [landmarks, mirrored]);

  if (!landmarks || landmarks.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className="face-landmark-canvas"
    />
  );
}

function VideoTile({ stream, name, muted, mirrored, isLocal, isVideoOff, isMuted, handRaised, isSpeaking, engagement, landmarks, attentionState }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    if (audioRef.current && stream && !isLocal) {
      audioRef.current.srcObject = stream;
    }
  }, [stream, isLocal]);

  // Audio level indicator for remote streams
  useEffect(() => {
    if (isLocal || !stream || isMuted) { setHasAudio(false); return; }
    let ctx, analyser, buf, animId;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      buf = new Uint8Array(analyser.frequencyBinCount);
    } catch { return; }

    const check = () => {
      analyser.getByteFrequencyData(buf);
      const level = buf.reduce((s, v) => s + v, 0) / buf.length;
      setHasAudio(level > 5);
      animId = requestAnimationFrame(check);
    };
    check();

    return () => {
      cancelAnimationFrame(animId);
      ctx.close().catch(() => {});
    };
  }, [stream, isLocal, isMuted]);

  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={`video-tile ${isSpeaking ? 'speaking' : ''}`}>
      <video ref={videoRef} autoPlay muted={muted} playsInline
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          transform: mirrored ? 'scaleX(-1)' : 'none',
          opacity: isVideoOff ? 0 : 1,
          position: isVideoOff ? 'absolute' : 'relative',
        }}
      />

      {isVideoOff && (
        <div className="video-tile-avatar">
          <div className="avatar-circle">{initials}</div>
        </div>
      )}

      {handRaised && (
        <div className="hand-indicator">{'\u270B'}</div>
      )}

      {engagement != null && (
        <div className="engagement-overlay">
          <span className={`engagement-score ${engagement >= 60 ? 'high' : engagement >= 30 ? 'mid' : 'low'}`}>
            {engagement}%
          </span>
        </div>
      )}

      {attentionState && attentionState !== 'focused' && (
        <div className={`attention-badge attention-${attentionState}`}>
          {attentionState === 'drowsy' ? '\u{1F634}' : attentionState === 'distracted' ? '\u{1F440}' : '\u{1F6B6}'}
          {' '}{attentionState}
        </div>
      )}

      <FaceLandmarkOverlay landmarks={landmarks} mirrored={mirrored} />

      {landmarks && landmarks.length > 0 && (
        <div className="face-tracking-badge">
          <span className="face-tracking-dot" />
          ML Tracking
        </div>
      )}

      <div className="video-tile-label">
        <div className="tile-label-row">
          {isMuted ? (
            <span className="tile-mic-icon muted" title="Muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
          ) : (
            <span className={`tile-mic-icon unmuted ${hasAudio ? 'speaking' : ''}`} title="Mic on">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </span>
          )}
          <span className="tile-name">{name}{isLocal ? ' (You)' : ''}</span>
        </div>
      </div>

      {!isLocal && (
        <audio ref={audioRef} autoPlay playsInline className="remote-audio" />
      )}
    </div>
  );
}

export default function VideoGrid({
  localStream, localName, remoteStreams, isVideoOff, isMuted,
  screenShareStream, raisedHands, localHandRaised,
  peerStatus, speakingPeers, localSid,
  metrics, monitoringEnabled, landmarks,
}) {
  const isMobile = useIsMobile();
  const remoteCount = Object.keys(remoteStreams).length;
  const isPipMode = remoteCount > 0;

  // Grid columns based on remote count only when in PiP mode
  const count = isPipMode ? remoteCount : 1;
  let cols;
  if (isMobile) {
    cols = count <= 2 ? 1 : 2;
  } else {
    if (count <= 1) cols = 1;
    else if (count <= 4) cols = 2;
    else if (count <= 9) cols = 3;
    else cols = 4;
  }

  const localEngagement = monitoringEnabled && metrics?.engagementScore != null
    ? metrics.engagementScore : null;
  const localAttention = monitoringEnabled && metrics?.attentionState
    ? metrics.attentionState : null;

  return (
    <div className="video-grid-container">
      {screenShareStream && (
        <div className="screen-share-view">
          <ScreenTile stream={screenShareStream} />
        </div>
      )}

      <div className={`video-grid${!isPipMode ? ' solo-mode' : ''}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          ...(screenShareStream ? { maxHeight: '20vh' } : {}),
        }}>
        {/* Local tile in grid only when alone */}
        {!isPipMode && (
          <VideoTile
            stream={localStream}
            name={localName}
            muted={true}
            mirrored={true}
            isLocal={true}
            isVideoOff={isVideoOff}
            isMuted={isMuted}
            handRaised={localHandRaised}
            isSpeaking={speakingPeers?.has(localSid)}
            engagement={localEngagement}
            landmarks={landmarks}
            attentionState={localAttention}
          />
        )}
        {Object.entries(remoteStreams).map(([peerId, { stream, name }]) => {
          const status = peerStatus?.[peerId] || {};
          return (
            <VideoTile
              key={peerId}
              stream={stream}
              name={name}
              muted={false}
              mirrored={false}
              isLocal={false}
              isVideoOff={status.isVideoOff || false}
              isMuted={status.isMuted || false}
              handRaised={!!raisedHands?.[peerId]}
              isSpeaking={speakingPeers?.has(peerId)}
              engagement={null}
            />
          );
        })}
      </div>

      {/* Local tile as PiP overlay when remote streams exist */}
      {isPipMode && (
        <div className="pip-container">
          <VideoTile
            stream={localStream}
            name={localName}
            muted={true}
            mirrored={true}
            isLocal={true}
            isVideoOff={isVideoOff}
            isMuted={isMuted}
            handRaised={localHandRaised}
            isSpeaking={speakingPeers?.has(localSid)}
            engagement={localEngagement}
            landmarks={landmarks}
            attentionState={localAttention}
          />
        </div>
      )}
    </div>
  );
}

function ScreenTile({ stream }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);
  return (
    <video ref={videoRef} autoPlay muted playsInline
      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
  );
}
