import React, { useEffect, useRef, useState } from 'react';
import io       from 'socket.io-client';
import * as faceapi from 'face-api.js';
import axios    from 'axios';
import { SERVER } from '../api';

const MODELS_URL = '/models';
const TICK_MS    = 700;

/* ── Engagement score algorithm ──────────────────────────────────────
   Weights: face presence 40%, expression 35%, audio energy 25%
*/
function computeScore(faceFound, expressions, audioLevel) {
  const faceScore = faceFound ? 1.0 : 0.0;

  let exprScore = 0.5;
  if (faceFound && expressions) {
    exprScore =
      (expressions.happy      || 0) * 1.0 +
      (expressions.neutral    || 0) * 0.70 +
      (expressions.surprised  || 0) * 0.80 +
      (expressions.fearful    || 0) * 0.40 +
      (expressions.sad        || 0) * 0.30 +
      (expressions.angry      || 0) * 0.30 +
      (expressions.disgusted  || 0) * 0.20;
  }

  const audioScore = Math.min(1.0, (audioLevel || 0) / 150);
  return Math.round((faceScore * 0.40 + exprScore * 0.35 + audioScore * 0.25) * 100);
}

function topEmotion(expressions) {
  if (!expressions) return 'neutral';
  return Object.entries(expressions).sort(([,a],[,b]) => b-a)[0]?.[0] ?? 'neutral';
}

const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

export default function ParticipantView({ meetingId, userName, onLeave }) {
  const videoRef  = useRef(null);
  const socketRef = useRef(null);
  const audioRef  = useRef({ ctx: null, analyser: null, buf: null });
  const activeRef = useRef(true);
  const streamRef = useRef(null);
  const startRef  = useRef(Date.now());

  const [stage,     setStage]     = useState('loading');
  const [errMsg,    setErrMsg]    = useState('');
  const [connected, setConnected] = useState(false);
  const [elapsed,   setElapsed]   = useState(0);

  /* session timer */
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Main setup effect ─────────────────────────────────────────── */
  useEffect(() => {
    activeRef.current = true;

    async function init() {
      /* 1. Load AI models */
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL),
        ]);
      } catch (e) {
        console.error('Model load failed', e);
        setErrMsg('Could not load AI models from /models. Make sure the Docker build completed or run the download-models script.');
        setStage('error');
        return;
      }
      if (!activeRef.current) return;

      /* 2. Request camera + mic */
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
      } catch {
        setErrMsg('Camera or microphone access was denied. Please allow permissions and refresh.');
        setStage('error');
        return;
      }
      if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

      /* 3. Attach stream to video element */
      const video = videoRef.current;
      video.srcObject = stream;
      await new Promise(res => {
        if (video.readyState >= 3) { res(); return; }
        video.addEventListener('loadeddata', res, { once: true });
      });
      await video.play().catch(() => {});

      /* 4. Audio analyser */
      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      audioRef.current = { ctx, analyser, buf };

      /* 5. Socket.io */
      const socket = io(SERVER, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join', { meetingId, role: 'audience', name: userName });
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('sessionEnded', () => {
        alert('The presenter has ended this session.');
        cleanup();
        onLeave();
      });

      setStage('ready');

      /* 6. Background analysis loop — sends metrics to server but does NOT display them */
      async function tick() {
        if (!activeRef.current) return;
        try {
          const result = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

          const found = !!result;
          const exprs = result?.expressions ?? null;

          /* audio frequency analysis */
          audioRef.current.analyser.getByteFrequencyData(audioRef.current.buf);
          const freqBuf = audioRef.current.buf;
          const avg = freqBuf.length ? freqBuf.reduce((a, b) => a + b, 0) / freqBuf.length : 0;

          /* speech pace via zero-crossing rate on time-domain data */
          const timeBuf = new Uint8Array(audioRef.current.analyser.frequencyBinCount);
          audioRef.current.analyser.getByteTimeDomainData(timeBuf);
          let zeroCrossings = 0;
          for (let i = 1; i < timeBuf.length; i++) {
            if ((timeBuf[i] >= 128 && timeBuf[i - 1] < 128) ||
                (timeBuf[i] < 128 && timeBuf[i - 1] >= 128)) {
              zeroCrossings++;
            }
          }

          let speechPace = 'silent';
          if (avg > 15) {
            if (zeroCrossings > 80) speechPace = 'fast';
            else if (zeroCrossings > 40) speechPace = 'moderate';
            else speechPace = 'slow';
          }

          let vocalEnergy = 'silent';
          if (avg > 80) vocalEnergy = 'high';
          else if (avg > 35) vocalEnergy = 'medium';
          else if (avg > 15) vocalEnergy = 'low';

          const eng = computeScore(found, exprs, avg);
          const emo = topEmotion(exprs);

          if (socket.connected) {
            socket.emit('engagement', {
              meetingId,
              name: userName,
              metrics: {
                engagementScore: eng,
                faceDetected:    found,
                emotion:         emo,
                audioLevel:      Math.round(avg),
                speechPace,
                vocalEnergy,
                ts:              Date.now(),
              },
            });
          }
        } catch { /* video paused / page hidden */ }

        if (activeRef.current) setTimeout(tick, TICK_MS);
      }
      tick();
    }

    init();

    return () => {
      activeRef.current = false;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, userName]);

  function cleanup() {
    activeRef.current = false;
    socketRef.current?.disconnect();
    audioRef.current?.ctx?.close().catch(() => {});
    streamRef.current?.getTracks().forEach(t => t.stop());
  }

  function handleLeave() { cleanup(); onLeave(); }

  async function sendFeedback() {
    const msg = window.prompt('Feedback for the presenter:');
    if (!msg?.trim()) return;
    try {
      await axios.post(`${SERVER}/feedback`, { meetingId, from: userName, message: msg.trim() });
    } catch {
      alert('Could not send feedback. Check your connection.');
    }
  }

  /* ── Render: loading ─────────────────────────────────────────── */
  if (stage === 'loading') {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center', gap:16, background:'#0d1117' }}>
        <div className="spinner" />
        <p style={{ color:'#94a3b8', fontSize:15 }}>Loading AI models...</p>
      </div>
    );
  }

  /* ── Render: error ───────────────────────────────────────────── */
  if (stage === 'error') {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center', gap:16, padding:32, background:'#0d1117' }}>
        <div style={{ background:'#7f1d1d', border:'1px solid #ef4444', borderRadius:14,
                      padding:'28px 32px', maxWidth:480, textAlign:'center' }}>
          <div style={{ color:'#fca5a5', fontWeight:700, fontSize:17, marginBottom:8 }}>Setup Error</div>
          <div style={{ color:'#fecaca', fontSize:14, lineHeight:1.6 }}>{errMsg}</div>
        </div>
        <button onClick={onLeave} style={{ background:'#1e2433', color:'#e2e8f0', border:'1px solid #30363d',
                                           borderRadius:8, padding:'10px 24px', cursor:'pointer', fontSize:14 }}>
          Back to Home
        </button>
      </div>
    );
  }

  /* ── Render: main — clean meeting view (no metrics shown) ──── */
  return (
    <div style={{ minHeight:'100vh', background:'#0d1117', display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'16px 24px', borderBottom:'1px solid #1e2433' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontWeight:800, fontSize:20, color:'#e2e8f0' }}>EngageAI</span>
          <div style={{ background:'#1e2433', borderRadius:8, padding:'6px 14px',
                        fontFamily:'monospace', fontSize:15, fontWeight:700,
                        color:'#a78bfa', letterSpacing:3 }}>
            {meetingId}
          </div>
          <div style={{ background:'#1e2433', borderRadius:8, padding:'6px 12px',
                        fontSize:14, color:'#6b7280', fontFamily:'monospace' }}>
            {fmt(elapsed)}
          </div>
          {connected && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div className="live-dot" style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e' }} />
              <span style={{ fontSize:12, color:'#22c55e', fontWeight:600 }}>LIVE</span>
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={sendFeedback} style={{
            background:'#1e2433', color:'#a78bfa', border:'1px solid #8b5cf6',
            borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer',
          }}>
            Send Feedback
          </button>
          <button onClick={handleLeave} style={{
            background:'#7f1d1d', color:'#fca5a5', border:'1px solid #ef4444',
            borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer',
          }}>
            Leave Meeting
          </button>
        </div>
      </div>

      {/* Main — centered video */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:32 }}>
        <div style={{ maxWidth:800, width:'100%' }}>
          <div style={{ background:'#161b22', borderRadius:16, overflow:'hidden',
                        border:'1px solid #21262d' }}>
            {/* Video */}
            <div style={{ position:'relative', background:'#0a0e1a' }}>
              <video ref={videoRef} autoPlay muted playsInline
                style={{ width:'100%', display:'block', maxHeight:520, objectFit:'cover' }} />

              {/* Connection indicator */}
              <div style={{
                position:'absolute', top:12, right:12,
                background: connected ? '#0e2318' : '#78350f',
                border: `1px solid ${connected ? '#22c55e' : '#f59e0b'}`,
                color:  connected ? '#86efac' : '#fde68a',
                borderRadius:8, padding:'4px 12px', fontSize:12, fontWeight:600,
              }}>
                {connected ? 'Connected' : 'Connecting...'}
              </div>
            </div>

            {/* Name bar */}
            <div style={{ padding:'14px 18px', borderTop:'1px solid #1e2433',
                          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontWeight:600, color:'#e2e8f0', fontSize:15 }}>{userName}</span>
              <span style={{ fontSize:12, color:'#6b7280' }}>Your camera is being shared</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
