import React from 'react';

function scoreColor(score) {
  if (score >= 75) return '#34a853';
  if (score >= 50) return '#f9ab00';
  if (score >= 1) return '#ea4335';
  return '#555';
}

const fmt = ms => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

const attentionColors = {
  focused: '#34a853',
  distracted: '#f9ab00',
  drowsy: '#ea4335',
  away: '#9aa0a6',
};

const attentionIcons = {
  focused: '\u2713',
  distracted: '\u26A0',
  drowsy: '\u{1F634}',
  away: '\u{1F6B6}',
};

export default function ParticipantTile({ participant }) {
  const { name = '?', activePct = 0, lastMetrics, talkTimeMs = 0, awayTimeMs = 0, visibleTimeMs = 0, listeningTimeMs = 0, emotionTimes = {} } = participant;
  const hasData = lastMetrics !== null && lastMetrics !== undefined;
  const border = scoreColor(activePct);
  const attention = lastMetrics?.attentionState;

  return (
    <div style={{
      borderRadius: 12, border: `2px solid ${hasData ? border : 'rgba(255,255,255,.08)'}`,
      overflow: 'hidden', background: '#1a1a24', transition: 'border-color .4s, box-shadow .4s',
      boxShadow: hasData ? `0 0 16px ${border}22, 0 2px 8px rgba(0,0,0,.3)` : '0 2px 8px rgba(0,0,0,.3)',
    }}>
      {/* Avatar area with engagement ring */}
      <div style={{
        aspectRatio: '4/3', background: '#12121a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Engagement ring */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: `conic-gradient(${border} ${activePct * 3.6}deg, rgba(255,255,255,.08) 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .4s',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff',
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Attention state indicator */}
        {hasData && attention && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            width: 22, height: 22, borderRadius: '50%',
            background: attentionColors[attention],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, boxShadow: `0 0 10px ${attentionColors[attention]}80`,
          }}>
            {attentionIcons[attention] || ''}
          </div>
        )}

        {/* Face detected indicator */}
        {hasData && lastMetrics?.faceDetected && (
          <div style={{
            position: 'absolute', bottom: 6, left: 6,
            fontSize: 9, fontWeight: 700, color: '#34a853',
            background: 'rgba(52,168,83,.15)', border: '1px solid rgba(52,168,83,.3)',
            borderRadius: 4, padding: '1px 6px', letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: '#34a853',
              display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            TRACKING
          </div>
        )}
      </div>

      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{
            fontWeight: 700, fontSize: 13, color: '#fff',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {name}
          </span>
          {hasData && attention && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: `${attentionColors[attention]}20`,
              border: `1px solid ${attentionColors[attention]}40`,
              color: attentionColors[attention],
              textTransform: 'capitalize',
            }}>
              {attention}
            </span>
          )}
          {hasData && !attention && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: 'rgba(52,168,83,.12)', border: '1px solid rgba(52,168,83,.3)', color: '#34a853',
            }}>
              active
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: border }}>
            {hasData ? `${Math.round(activePct)}%` : 'Waiting...'}
          </span>
          {hasData && lastMetrics?.emotion && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textTransform: 'capitalize' }}>
              {lastMetrics.emotion}
            </span>
          )}
        </div>

        {/* Engagement mini-bar */}
        {hasData && (
          <div style={{
            height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2,
            overflow: 'hidden', marginTop: 6,
          }}>
            <div style={{
              width: `${activePct}%`, height: '100%', borderRadius: 2,
              background: border, transition: 'width .4s',
              boxShadow: `0 0 6px ${border}60`,
            }} />
          </div>
        )}

        {hasData && lastMetrics?.speechPace && lastMetrics.speechPace !== 'silent' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.06)', borderRadius: 4, padding: '2px 6px' }}>
              Pace: {lastMetrics.speechPace}
            </span>
            {lastMetrics.vocalEnergy && lastMetrics.vocalEnergy !== 'silent' && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.06)', borderRadius: 4, padding: '2px 6px' }}>
                Energy: {lastMetrics.vocalEnergy}
              </span>
            )}
          </div>
        )}

        {hasData && (lastMetrics?.gazeScore != null || lastMetrics?.drowsinessScore != null) && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {lastMetrics.gazeScore != null && (
              <span style={{
                fontSize: 10, borderRadius: 4, padding: '2px 6px',
                color: lastMetrics.gazeScore > 0.6 ? '#34a853' : '#f9ab00',
                background: lastMetrics.gazeScore > 0.6 ? 'rgba(52,168,83,.12)' : 'rgba(249,171,0,.12)',
                border: `1px solid ${lastMetrics.gazeScore > 0.6 ? 'rgba(52,168,83,.25)' : 'rgba(249,171,0,.25)'}`,
              }}>
                Gaze: {Math.round(lastMetrics.gazeScore * 100)}%
              </span>
            )}
            {lastMetrics.drowsinessScore > 0.2 && (
              <span style={{
                fontSize: 10, borderRadius: 4, padding: '2px 6px',
                color: '#f87171', background: 'rgba(234,67,53,.12)',
                border: '1px solid rgba(234,67,53,.25)',
              }}>
                Drowsy: {Math.round(lastMetrics.drowsinessScore * 100)}%
              </span>
            )}
            {lastMetrics.blinkRate > 0 && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.06)', borderRadius: 4, padding: '2px 6px' }}>
                Blink: {lastMetrics.blinkRate}/min
              </span>
            )}
          </div>
        )}

        {(talkTimeMs > 0 || awayTimeMs > 0) && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {talkTimeMs > 0 && (
              <span style={{ fontSize: 10, color: '#34a853', background: 'rgba(52,168,83,.12)', borderRadius: 4, padding: '2px 6px', border: '1px solid rgba(52,168,83,.25)' }}>
                Talk: {fmt(talkTimeMs)}
              </span>
            )}
            {awayTimeMs > 0 && (
              <span style={{ fontSize: 10, color: '#f9ab00', background: 'rgba(249,171,0,.12)', borderRadius: 4, padding: '2px 6px', border: '1px solid rgba(249,171,0,.25)' }}>
                Away: {fmt(awayTimeMs)}
              </span>
            )}
          </div>
        )}

        {(visibleTimeMs > 0 || listeningTimeMs > 0) && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {visibleTimeMs > 0 && (
              <span style={{ fontSize: 10, color: '#34a853', background: 'rgba(52,168,83,.12)', borderRadius: 4, padding: '2px 6px', border: '1px solid rgba(52,168,83,.25)' }}>
                Visible: {fmt(visibleTimeMs)}
              </span>
            )}
            {listeningTimeMs > 0 && (
              <span style={{ fontSize: 10, color: '#818cf8', background: 'rgba(99,102,241,.12)', borderRadius: 4, padding: '2px 6px', border: '1px solid rgba(99,102,241,.25)' }}>
                Listening: {fmt(listeningTimeMs)}
              </span>
            )}
          </div>
        )}

        {Object.keys(emotionTimes).length > 0 && (() => {
          const sorted = Object.entries(emotionTimes)
            .filter(([, ms]) => ms > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
          if (sorted.length === 0) return null;
          return (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {sorted.map(([emo, ms]) => (
                <span key={emo} style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.06)', borderRadius: 4, padding: '2px 6px', textTransform: 'capitalize' }}>
                  {emo}: {fmt(ms)}
                </span>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
