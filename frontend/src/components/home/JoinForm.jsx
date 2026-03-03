import React from 'react';

export default function JoinForm({
  tab, setTab, name, setName, joinId, setJoinId,
  adminUser, setAdminUser, adminPass, setAdminPass,
  busy, error, clearErr,
  onAdminLogin, onRequestJoin, onKey,
}) {
  return (
    <>
      <h2 className="home-card-title">Welcome</h2>
      <p className="home-card-sub">Login as admin or join an existing meeting.</p>

      <div className="home-tabs" role="tablist">
        {['admin', 'join'].map(t => (
          <button key={t} role="tab" aria-selected={tab === t}
            onClick={() => { setTab(t); clearErr(); }}
            className={`home-tab ${tab === t ? 'active' : ''}`}>
            {t === 'admin' ? 'Admin Login' : 'Join Meeting'}
          </button>
        ))}
      </div>

      {tab === 'admin' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="home-label" htmlFor="admin-user">Username</label>
            <input id="admin-user" className="home-input" type="text" placeholder="admin"
              value={adminUser}
              onChange={e => { setAdminUser(e.target.value); clearErr(); }}
              onKeyDown={e => onKey(e, onAdminLogin)} />
          </div>
          <div>
            <label className="home-label" htmlFor="admin-pass">Password</label>
            <input id="admin-pass" className="home-input" type="password" placeholder="Enter password"
              value={adminPass}
              onChange={e => { setAdminPass(e.target.value); clearErr(); }}
              onKeyDown={e => onKey(e, onAdminLogin)} />
          </div>

          {error && <div className="home-error" role="alert">{error}</div>}

          <button className="home-btn" disabled={busy}
            style={{ opacity: busy ? 0.6 : 1 }}
            onClick={onAdminLogin}>
            {busy ? 'Logging in...' : 'Login'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="home-label" htmlFor="join-name">Your Name</label>
            <input id="join-name" className="home-input" type="text" placeholder="Enter your name"
              value={name} onChange={e => { setName(e.target.value); clearErr(); }}
              onKeyDown={e => onKey(e, onRequestJoin)} />
          </div>
          <div>
            <label className="home-label" htmlFor="join-id">Meeting ID</label>
            <input id="join-id" className="home-input" type="text" placeholder="e.g. A3F1C2"
              style={{ letterSpacing: 3, fontWeight: 700, fontFamily: 'monospace' }}
              value={joinId}
              onChange={e => { setJoinId(e.target.value.toUpperCase()); clearErr(); }}
              onKeyDown={e => onKey(e, onRequestJoin)} />
          </div>

          {error && <div className="home-error" role="alert">{error}</div>}

          <button className="home-btn" disabled={busy}
            style={{ opacity: busy ? 0.6 : 1 }}
            onClick={onRequestJoin}>
            {busy ? 'Joining...' : 'Join Meeting'}
          </button>
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 16 }}>
        Camera &amp; mic required &middot; No raw video stored
      </p>
    </>
  );
}
