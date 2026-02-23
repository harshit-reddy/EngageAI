import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SERVER } from '../api';

/* ── tiny inline SVG icons ── */
const IconAnalytics = () => (
  <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);
const IconUsers = () => (
  <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
const IconFeedback = () => (
  <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const FEATURES = [
  { icon: <IconAnalytics />, title: 'Real-Time Analytics',  desc: 'Track engagement levels as they happen' },
  { icon: <IconUsers />,     title: 'Audience Insights',    desc: 'Understand individual participant engagement' },
  { icon: <IconFeedback />,  title: 'Private Feedback',     desc: 'Get actionable suggestions in real-time' },
];

/* ── styles ── */
const S = {
  page:    { display:'flex', minHeight:'100vh' },
  left:    { flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'56px 48px',
             background:'linear-gradient(155deg,#4f46e5 0%,#7c3aed 55%,#2563eb 100%)', color:'#fff' },
  logo:    { display:'flex', alignItems:'center', gap:12, marginBottom:28 },
  logoBg:  { width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.18)',
             display:'flex', alignItems:'center', justifyContent:'center' },
  h1:      { fontSize:38, fontWeight:800, lineHeight:1.2, marginBottom:14, maxWidth:420 },
  sub:     { fontSize:17, opacity:.85, marginBottom:44, maxWidth:400, lineHeight:1.6 },
  fCard:   { display:'flex', alignItems:'center', gap:18, background:'rgba(255,255,255,0.12)',
             borderRadius:16, padding:'18px 22px', marginBottom:14 },
  fIcon:   { flexShrink:0, opacity:.9 },
  right:   { width:460, display:'flex', alignItems:'center', justifyContent:'center', padding:48,
             background:'#f1f5f9' },
  card:    { background:'#fff', borderRadius:24, padding:'40px 36px', width:'100%',
             boxShadow:'0 20px 60px rgba(0,0,0,0.15)' },
  tabs:    { display:'flex', background:'#f1f5f9', borderRadius:10, padding:4, marginBottom:28 },
  input:   { width:'100%', padding:'12px 14px', borderRadius:10, border:'1.5px solid #e2e8f0',
             fontSize:15, color:'#1e293b', outline:'none', background:'#f8fafc',
             fontFamily:'inherit' },
  btn:     { width:'100%', padding:'14px', borderRadius:12, border:'none', cursor:'pointer',
             background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff',
             fontWeight:700, fontSize:16, letterSpacing:.3,
             boxShadow:'0 4px 20px rgba(99,102,241,.4)', transition:'opacity .15s' },
  err:     { background:'#fef2f2', border:'1px solid #fca5a5', color:'#dc2626',
             borderRadius:8, padding:'10px 14px', fontSize:13, marginTop:4 },
  note:    { textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:18 },
};

export default function Home({ onStart, onJoin, preJoinId }) {
  const [tab,    setTab]    = useState('start');
  const [name,   setName]   = useState('');
  const [joinId, setJoinId] = useState('');
  const [busy,   setBusy]   = useState(false);
  const [error,  setError]  = useState('');
  const [showConsent, setShowConsent] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'start' | 'join'

  // Auto-fill join ID from URL param ?join=MEETINGID
  useEffect(() => {
    if (preJoinId) {
      setTab('join');
      setJoinId(preJoinId);
    }
  }, [preJoinId]);

  function clearErr() { setError(''); }

  function requestStart() {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    setPendingAction('start');
    setShowConsent(true);
  }

  function requestJoin() {
    if (!name.trim())   { setError('Please enter your name.');      return; }
    if (!joinId.trim()) { setError('Please enter the meeting ID.'); return; }
    setPendingAction('join');
    setShowConsent(true);
  }

  function onConsent() {
    setShowConsent(false);
    if (pendingAction === 'start') handleStart();
    else handleJoin();
  }

  async function handleStart() {
    setBusy(true); setError('');
    try {
      const { data } = await axios.post(`${SERVER}/session`, { name: name.trim() });
      onStart(data.sessionId, name.trim());
    } catch {
      setError('Cannot reach backend. Is the server running? (port 4000)');
    } finally { setBusy(false); }
  }

  async function handleJoin() {
    setBusy(true); setError('');
    try {
      await axios.get(`${SERVER}/session/${joinId.trim().toUpperCase()}`);
      onJoin(joinId.trim().toUpperCase(), name.trim());
    } catch (e) {
      const msg = e.response?.data?.error ?? 'Meeting not found. Check the ID.';
      setError(msg);
    } finally { setBusy(false); }
  }

  function onKey(e) {
    if (e.key === 'Enter') tab === 'start' ? requestStart() : requestJoin();
  }

  return (
    <div style={S.page}>
      {/* Left — branding + features */}
      <div style={S.left}>
        <div style={S.logo}>
          <div style={S.logoBg}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          </div>
          <span style={{ fontSize:26, fontWeight:800, letterSpacing:-.5 }}>EngageAI</span>
        </div>

        <h1 style={S.h1}>Real-Time Engagement Detection</h1>
        <p style={S.sub}>
          Analyze facial expressions, vocal energy, and attention — live in your browser.
          No data stored. No plugins needed.
        </p>

        {FEATURES.map(f => (
          <div key={f.title} style={S.fCard}>
            <span style={S.fIcon}>{f.icon}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:15 }}>{f.title}</div>
              <div style={{ opacity:.8, fontSize:13, marginTop:3 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Right — form card */}
      <div style={S.right}>
        <div style={S.card}>
          <h2 style={{ color:'#1e293b', fontWeight:800, fontSize:24, marginBottom:6 }}>Get Started</h2>
          <p style={{ color:'#64748b', fontSize:14, marginBottom:28 }}>
            Host a session or join one that's already live.
          </p>

          {/* Tab switcher */}
          <div style={S.tabs}>
            {['start', 'join'].map(t => (
              <button key={t} onClick={() => { setTab(t); clearErr(); }} style={{
                flex:1, padding:'10px 0', borderRadius:8, border:'none', cursor:'pointer',
                fontWeight:600, fontSize:14, fontFamily:'inherit',
                background: tab === t ? '#fff' : 'transparent',
                color:      tab === t ? '#6366f1' : '#64748b',
                boxShadow:  tab === t ? '0 1px 4px rgba(0,0,0,.12)' : 'none',
                transition: 'all .15s',
              }}>
                {t === 'start' ? 'Start Meeting' : 'Join Meeting'}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                Your Name
              </label>
              <input
                style={S.input} type="text" placeholder="e.g. Alice"
                value={name} onChange={e => { setName(e.target.value); clearErr(); }} onKeyDown={onKey}
              />
            </div>

            {tab === 'join' && (
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                  Meeting ID
                </label>
                <input
                  style={{ ...S.input, letterSpacing:3, fontWeight:700 }}
                  type="text" placeholder="e.g. A3F1C2"
                  value={joinId}
                  onChange={e => { setJoinId(e.target.value.toUpperCase()); clearErr(); }}
                  onKeyDown={onKey}
                />
              </div>
            )}

            {error && <div style={S.err}>{error}</div>}

            <button
              style={{ ...S.btn, opacity: busy ? .65 : 1 }}
              disabled={busy}
              onClick={tab === 'start' ? requestStart : requestJoin}
            >
              {busy ? 'Connecting...' : (tab === 'start' ? 'Start Meeting' : 'Join Meeting')}
            </button>
          </div>

          <p style={S.note}>Camera &amp; microphone required &middot; No raw video stored</p>
        </div>
      </div>

      {/* ── Privacy Consent Modal ── */}
      {showConsent && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:100,
        }}>
          <div className="modal-enter" style={{
            background:'#fff', borderRadius:20, padding:'36px 32px', maxWidth:440,
            width:'90%', boxShadow:'0 25px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'#eef2ff',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3 style={{ color:'#1e293b', fontWeight:700, fontSize:18 }}>Privacy Notice</h3>
            </div>

            <div style={{ color:'#475569', fontSize:14, lineHeight:1.7, marginBottom:24 }}>
              <p style={{ marginBottom:12 }}>
                EngageAI uses your <strong>camera</strong> and <strong>microphone</strong> to
                analyze facial expressions and vocal patterns for engagement detection.
              </p>
              <ul style={{ paddingLeft:20, display:'flex', flexDirection:'column', gap:6 }}>
                <li>No raw video or audio is recorded or stored</li>
                <li>Only computed engagement metrics are transmitted</li>
                <li>All processing happens locally in your browser</li>
                <li>You can leave the session at any time</li>
              </ul>
            </div>

            <div style={{ display:'flex', gap:12 }}>
              <button
                onClick={() => setShowConsent(false)}
                style={{
                  flex:1, padding:'12px', borderRadius:10, border:'1.5px solid #e2e8f0',
                  background:'#fff', color:'#64748b', fontWeight:600, fontSize:14,
                  cursor:'pointer', fontFamily:'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConsent}
                style={{
                  flex:1, padding:'12px', borderRadius:10, border:'none',
                  background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff',
                  fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit',
                  boxShadow:'0 4px 15px rgba(99,102,241,.4)',
                }}
              >
                I Agree — Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
