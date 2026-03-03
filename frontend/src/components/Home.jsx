import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SERVER } from '../api';
import AdminPanel from './home/AdminPanel';
import JoinForm from './home/JoinForm';

const LogoSvg = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="2" y="14" width="5" height="12" rx="1.5" fill="rgba(255,255,255,0.7)" />
    <rect x="9" y="8" width="5" height="18" rx="1.5" fill="rgba(255,255,255,0.85)" />
    <rect x="16" y="4" width="5" height="22" rx="1.5" fill="#fff" />
    <rect x="23" y="10" width="5" height="16" rx="1.5" fill="rgba(255,255,255,0.7)" />
  </svg>
);

export default function Home({
  onStart, onJoin, preJoinId,
  isAdmin, onAdminLogin, onAdminLogout,
  onViewDashboard, onViewAnalytics,
}) {
  const [tab, setTab] = useState('join');
  const [name, setName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showConsent, setShowConsent] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [mlStatus, setMlStatus] = useState(null);

  const [meetingName, setMeetingName] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  useEffect(() => {
    if (preJoinId) { setTab('join'); setJoinId(preJoinId); }
  }, [preJoinId]);

  useEffect(() => {
    axios.get(`${SERVER}/network-info`).then(r => setMlStatus(r.data.ml)).catch(() => {});
  }, []);

  function clearErr() { setError(''); }

  async function handleAdminLogin() {
    setBusy(true); setError('');
    try {
      const { data } = await axios.post(`${SERVER}/admin/login`, {
        username: adminUser.trim(), password: adminPass,
      });
      if (data.ok) { onAdminLogin(); setAdminUser(''); setAdminPass(''); }
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid credentials');
    } finally { setBusy(false); }
  }

  function requestStart() {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    setPendingAction('start'); setShowConsent(true);
  }

  function requestJoin() {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!joinId.trim()) { setError('Please enter the meeting ID.'); return; }
    setPendingAction('join'); setShowConsent(true);
  }

  function onConsent() {
    setShowConsent(false);
    if (pendingAction === 'start') handleStart();
    else handleJoin();
  }

  async function handleStart() {
    setBusy(true); setError('');
    try {
      const { data } = await axios.post(`${SERVER}/session`, { name: name.trim(), meetingName: meetingName.trim() });
      onStart(data.sessionId, name.trim(), meetingName.trim());
    } catch {
      setError('Cannot reach backend. Is the server running on port 5000?');
    } finally { setBusy(false); }
  }

  async function handleJoin() {
    setBusy(true); setError('');
    try {
      const { data } = await axios.get(`${SERVER}/session/${joinId.trim().toUpperCase()}`);
      onJoin(joinId.trim().toUpperCase(), name.trim(), data.meetingName || '');
    } catch (e) {
      setError(e.response?.data?.error ?? 'Meeting not found. Check the ID.');
    } finally { setBusy(false); }
  }

  function onKey(e, action) { if (e.key === 'Enter') action(); }

  return (
    <div className="home-page">
      <div className="home-left">
        <div className="home-logo">
          <div className="home-logo-icon"><LogoSvg /></div>
          <span className="home-logo-text">EngageAI</span>
        </div>
        <h1 className="home-h1">Real-Time Engagement Detection</h1>
        <p className="home-sub">
          AI-powered meeting analytics — facial expression recognition,
          engagement scoring &amp; vocal analysis. All processed locally.
        </p>
        <div className="home-features">
          {[
            { icon: '\u{1F9E0}', title: 'Advanced ML Engine', desc: 'MediaPipe + GradientBoosting + Gaze & Attention Detection' },
            { icon: '\u{1F4CA}', title: 'Real-Time Analytics', desc: 'Engagement, emotion, drowsiness & attention tracking' },
            { icon: '\u{1F91D}', title: 'Meeting Platform', desc: 'Video, screen share, whiteboard, chat & MongoDB persistence' },
          ].map(f => (
            <div key={f.title} className="home-feature-card">
              <span style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{f.title}</div>
                <div style={{ opacity: 0.7, fontSize: 13, marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        {mlStatus !== null && (
          <div style={{ marginTop: 24, fontSize: 12, opacity: 0.7 }}>
            ML Engine: {mlStatus ? 'Active' : 'Unavailable (install ML deps)'}
          </div>
        )}
      </div>

      <div className="home-right">
        <div className="home-card">
          {isAdmin ? (
            <AdminPanel
              name={name} setName={setName}
              meetingName={meetingName} setMeetingName={setMeetingName}
              busy={busy} error={error} clearErr={clearErr}
              onRequestStart={requestStart} onViewDashboard={onViewDashboard}
              onAdminLogout={onAdminLogout} onKey={onKey}
            />
          ) : (
            <JoinForm
              tab={tab} setTab={setTab} name={name} setName={setName}
              joinId={joinId} setJoinId={setJoinId}
              adminUser={adminUser} setAdminUser={setAdminUser}
              adminPass={adminPass} setAdminPass={setAdminPass}
              busy={busy} error={error} clearErr={clearErr}
              onAdminLogin={handleAdminLogin} onRequestJoin={requestJoin} onKey={onKey}
            />
          )}
        </div>
      </div>

      {showConsent && (
        <div className="modal-backdrop">
          <div className="modal-enter" style={{
            background: '#fff', borderRadius: 16, padding: '32px 28px', maxWidth: 420,
            width: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
              Privacy Notice
            </h3>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              <p style={{ marginBottom: 10 }}>
                EngageAI uses your <strong>camera</strong> and <strong>microphone</strong> to
                analyze engagement via Python ML on the server.
              </p>
              <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>Compressed frames sent to local server for ML analysis</li>
                <li>No raw video/audio is recorded or stored</li>
                <li>All ML processing on your local network</li>
                <li>You can leave at any time</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConsent(false)} className="home-btn-secondary">Cancel</button>
              <button onClick={onConsent} className="home-btn">I Agree &mdash; Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
