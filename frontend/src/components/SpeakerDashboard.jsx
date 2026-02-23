import React, { useCallback, useEffect, useRef, useState } from 'react';
import io    from 'socket.io-client';
import axios from 'axios';
import { SERVER } from '../api';
import ParticipantTile   from './ParticipantTile';
import TrendChart        from './TrendChart';
import DistributionChart from './DistributionChart';

const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

function Card({ title, children, style }) {
  return (
    <div style={{ background:'#161b22', borderRadius:16, padding:24, ...style }}>
      {title && <h3 style={{ color:'#e2e8f0', fontWeight:700, fontSize:15, marginBottom:18 }}>{title}</h3>}
      {children}
    </div>
  );
}

export default function SpeakerDashboard({ meetingId, userName, onEnd }) {
  const socketRef = useRef(null);
  const startRef  = useRef(Date.now());

  const [participants, setParticipants] = useState({});
  const [trendData,    setTrendData]    = useState([]);
  const [feedback,     setFeedback]     = useState([]);
  const [alerts,       setAlerts]       = useState([]);
  const [elapsed,      setElapsed]      = useState(0);
  const [showSummary,  setShowSummary]  = useState(false);
  const [summary,      setSummary]      = useState(null);

  /* session timer */
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  /* handle incoming engagement from audience */
  const onEngagement = useCallback(({ participantId, name, metrics, activePct }) => {
    setParticipants(prev => ({
      ...prev,
      [participantId]: { name, activePct, lastMetrics: metrics },
    }));
    setTrendData(prev => {
      const next = [...prev, { time: new Date().toISOString(), engagement: activePct }];
      return next.slice(-360);
    });
  }, []);

  /* load old feedback & open socket */
  useEffect(() => {
    axios.get(`${SERVER}/feedback/${meetingId}`)
      .then(r => setFeedback(r.data.feedback.slice().reverse()))
      .catch(() => {});

    const socket = io(SERVER, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () =>
      socket.emit('join', { meetingId, role: 'speaker', name: userName })
    );
    socket.on('audienceEngagement', onEngagement);
    socket.on('newFeedback', item => setFeedback(prev => [item, ...prev]));
    socket.on('alert', alert => setAlerts(prev => [alert, ...prev].slice(0, 10)));
    socket.on('roomUpdate', ({ participants: list }) => {
      setParticipants(prev => {
        const activeIds = new Set(list.map(p => p.id));
        return Object.fromEntries(Object.entries(prev).filter(([id]) => activeIds.has(id)));
      });
    });
    socket.on('sessionEnded', (data) => {
      if (data?.summary) {
        setSummary(data.summary);
        setShowSummary(true);
      }
    });

    return () => socket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, userName]);

  async function endSession() {
    try { await axios.patch(`${SERVER}/session/${meetingId}/end`); } catch {}
  }

  function closeSummary() {
    setShowSummary(false);
    socketRef.current?.disconnect();
    onEnd();
  }

  /* derived values */
  const audience  = Object.entries(participants).map(([id, p]) => ({ id, ...p }));
  const scores    = audience.map(p => p.activePct || 0);
  const overall   = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
  const overallLbl =
    overall >= 80 ? 'High Engagement' :
    overall >= 60 ? 'Moderate Engagement' :
    overall >= 30 ? 'Low Engagement' : 'Disengaged';

  const shareUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port || 3000}?join=${meetingId}`;

  return (
    <div style={{ minHeight:'100vh', background:'#0d1117', padding:24 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
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
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div className="live-dot" style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e' }} />
            <span style={{ fontSize:12, color:'#22c55e', fontWeight:600 }}>LIVE</span>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, color:'#6b7280' }}>{audience.length} participant{audience.length !== 1 ? 's' : ''}</span>
          <span style={{ background:'#1e2433', color:'#a78bfa', border:'1px solid #8b5cf6',
                         borderRadius:8, padding:'6px 14px', fontSize:13, fontWeight:600 }}>
            You (Presenter)
          </span>
          <button onClick={endSession} style={{
            background:'#7f1d1d', color:'#fca5a5', border:'1px solid #ef4444',
            borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer',
          }}>
            End Session
          </button>
        </div>
      </div>

      {/* ── Share banner ─────────────────────────────────────── */}
      <div style={{ background:'#1e2433', borderRadius:12, padding:'12px 18px',
                    display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
        </svg>
        <span style={{ fontSize:14, color:'#94a3b8' }}>
          Share this link with participants:{' '}
          <strong style={{ color:'#e2e8f0', wordBreak:'break-all' }}>{shareUrl}</strong>
        </span>
      </div>

      {/* ── Alerts ───────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ marginBottom:24, display:'flex', flexDirection:'column', gap:8 }}>
          {alerts.slice(0, 3).map((a, i) => (
            <div key={i} style={{
              background:'#78350f', border:'1px solid #f59e0b', borderRadius:10,
              padding:'10px 16px', display:'flex', alignItems:'center', gap:10,
              color:'#fde68a', fontSize:13,
            }}>
              <span style={{ fontSize:16 }}>&#9888;</span>
              <span>{a.message}</span>
              <span style={{ marginLeft:'auto', fontSize:11, color:'#92400e' }}>
                {new Date(a.ts).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Participants grid ────────────────────────────────── */}
      <Card style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
          </svg>
          <h3 style={{ color:'#e2e8f0', fontWeight:700, fontSize:15 }}>
            Participants ({audience.length})
          </h3>
        </div>

        {audience.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#374151', fontSize:14 }}>
            No participants yet — share the link above.
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:16 }}>
            {audience.map(p => <ParticipantTile key={p.id} participant={p} />)}
          </div>
        )}
      </Card>

      {/* ── Overall engagement meter ─────────────────────────── */}
      <div style={{
        background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
        borderRadius:16, padding:28, marginBottom:24,
      }}>
        <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,.75)', marginBottom:8 }}>
          Overall Engagement
        </div>
        <div style={{ fontSize:56, fontWeight:800, color:'#fff', lineHeight:1, marginBottom:14 }}>
          {overall}%
        </div>
        <div style={{ background:'rgba(255,255,255,.2)', borderRadius:8, height:10, overflow:'hidden', marginBottom:10 }}>
          <div style={{
            height:'100%', borderRadius:8, background:'rgba(255,255,255,.85)',
            width:`${overall}%`, transition:'width .6s ease',
          }} />
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.7)' }}>{overallLbl}</div>
      </div>

      {/* ── Charts row ───────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:24 }}>
        <Card title="Engagement Trend">
          <TrendChart data={trendData} />
        </Card>
        <Card title="Engagement Distribution">
          <DistributionChart participants={participants} />
        </Card>
      </div>

      {/* ── Private feedback ─────────────────────────────────── */}
      <Card title="Private Feedback">
        {feedback.length === 0 ? (
          <div style={{ color:'#374151', fontSize:14 }}>No feedback received yet.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:300, overflowY:'auto' }}>
            {feedback.map(f => (
              <div key={f.id} style={{
                background:'#1a2d1e', border:'1px solid #22c55e', borderRadius:10,
                padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:10,
              }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2} style={{ flexShrink:0, marginTop:1 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div>
                  <div style={{ fontSize:13, color:'#e2e8f0' }}>{f.message}</div>
                  <div style={{ fontSize:11, color:'#6b7280', marginTop:4 }}>
                    {f.from} &middot; {new Date(f.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Session Summary Modal ────────────────────────────── */}
      {showSummary && summary && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:100,
        }}>
          <div className="modal-enter" style={{
            background:'#161b22', borderRadius:20, padding:32, maxWidth:560,
            width:'90%', maxHeight:'80vh', overflowY:'auto', border:'1px solid #21262d',
          }}>
            <h2 style={{ color:'#e2e8f0', fontWeight:800, fontSize:22, marginBottom:24 }}>
              Session Summary
            </h2>

            {/* Overall stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:24 }}>
              <div style={{ background:'#0d1117', borderRadius:12, padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:6 }}>Duration</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0' }}>
                  {Math.floor(summary.duration / 60)}m {summary.duration % 60}s
                </div>
              </div>
              <div style={{ background:'#0d1117', borderRadius:12, padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:6 }}>Participants</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#a78bfa' }}>
                  {summary.participantCount}
                </div>
              </div>
              <div style={{ background:'#0d1117', borderRadius:12, padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:6 }}>Avg Engagement</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#22c55e' }}>
                  {summary.overallEngagement}%
                </div>
              </div>
            </div>

            {/* Per-participant breakdown */}
            {summary.participants.length > 0 && (
              <>
                <h3 style={{ color:'#94a3b8', fontWeight:600, fontSize:13, marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>
                  Participant Breakdown
                </h3>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
                  {summary.participants.map(p => (
                    <div key={p.name} style={{
                      background:'#0d1117', borderRadius:10, padding:'12px 16px',
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                    }}>
                      <span style={{ fontWeight:600, color:'#e2e8f0', fontSize:14 }}>{p.name}</span>
                      <div style={{ display:'flex', gap:16 }}>
                        <span style={{ fontSize:13, color: p.avgEngagement >= 60 ? '#22c55e' : '#f59e0b' }}>
                          {p.avgEngagement}% avg
                        </span>
                        <span style={{ fontSize:13, color:'#6b7280', textTransform:'capitalize' }}>
                          {p.dominantEmotion}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button onClick={closeSummary} style={{
              width:'100%', padding:'14px', borderRadius:12, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff',
              fontWeight:700, fontSize:15, boxShadow:'0 4px 20px rgba(99,102,241,.4)',
            }}>
              Close &amp; Return Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
