import React from 'react';

function scoreColor(score) {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  if (score >= 1)  return '#ef4444';
  return '#374151';
}

const CamIcon = () => (
  <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth={1.2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/>
  </svg>
);

export default function ParticipantTile({ participant }) {
  const { name = '?', activePct = 0, lastMetrics } = participant;
  const hasData = lastMetrics !== null;
  const border  = scoreColor(activePct);

  return (
    <div style={{
      borderRadius: 12,
      border: `2px solid ${hasData ? border : '#21262d'}`,
      overflow: 'hidden',
      background: '#161b22',
      transition: 'border-color .4s',
    }}>
      {/* Video placeholder */}
      <div style={{
        aspectRatio: '4/3',
        background: '#0d1117',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <CamIcon />
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
          <span style={{
            fontWeight: 700, fontSize: 13, color: '#e2e8f0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {name}
          </span>
          {hasData && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: '#0e2318', border: '1px solid #22c55e', color: '#22c55e',
            }}>
              active
            </span>
          )}
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: border }}>
            {hasData ? `${Math.round(activePct)}%` : 'Waiting...'}
          </span>
          {hasData && lastMetrics?.emotion && (
            <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>
              {lastMetrics.emotion}
            </span>
          )}
        </div>

        {/* Speech pace & vocal energy badges */}
        {hasData && lastMetrics?.speechPace && lastMetrics.speechPace !== 'silent' && (
          <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
            <span style={{
              fontSize:10, color:'#94a3b8', background:'#1e2433',
              borderRadius:4, padding:'2px 6px',
            }}>
              Pace: {lastMetrics.speechPace}
            </span>
            {lastMetrics.vocalEnergy && lastMetrics.vocalEnergy !== 'silent' && (
              <span style={{
                fontSize:10, color:'#94a3b8', background:'#1e2433',
                borderRadius:4, padding:'2px 6px',
              }}>
                Energy: {lastMetrics.vocalEnergy}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
