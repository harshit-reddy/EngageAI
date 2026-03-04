import React, { useEffect, useState } from 'react';
import { SERVER, authAxios } from '../api';
import TrendChart from './TrendChart';
import DistributionChart from './DistributionChart';
import EmotionTimeline from './EmotionTimeline';
import TalkTimeChart from './TalkTimeChart';
import AwayTimeChart from './AwayTimeChart';
import ParticipantTile from './ParticipantTile';
import TranscriptPanel from './TranscriptPanel';

export default function MeetingDetail({ meetingId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authAxios.get(`${SERVER}/meetings/${meetingId}/analytics`)
      .then(r => setData(r.data))
      .catch(() => setError('Could not load analytics for this meeting.'))
      .finally(() => setLoading(false));
  }, [meetingId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="detail-page">
        <div className="detail-header">
          <button className="detail-back" onClick={onBack}>&larr; Back</button>
        </div>
        <div className="dashboard-empty">{error || 'No data found.'}</div>
      </div>
    );
  }

  const parts = data.participants || {};
  const partNames = Object.keys(parts);

  // Compute summary stats
  const allScores = [];
  partNames.forEach(n => allScores.push(...(parts[n].scores || [])));
  const avgEngagement = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  const durationMs = (data.endedAt || Date.now()) - data.startTime;
  const durationMin = Math.floor(durationMs / 60000);
  const durationSec = Math.floor((durationMs % 60000) / 1000);

  // Build chart data from stored analytics
  // TrendChart: build time series from all participant scores interleaved
  const trendData = [];
  partNames.forEach(name => {
    const scores = parts[name].scores || [];
    const timeline = parts[name].emotion_timeline || [];
    scores.forEach((score, i) => {
      const ts = timeline[i]?.ts || (data.startTime + i * 1000);
      trendData.push({ time: new Date(ts).toISOString(), engagement: score });
    });
  });
  trendData.sort((a, b) => a.time.localeCompare(b.time));
  // Average per time bucket (take every Nth to keep charts reasonable)
  const trendSampled = trendData.length > 360 ? trendData.filter((_, i) => i % Math.ceil(trendData.length / 360) === 0) : trendData;

  // DistributionChart: {name: {activePct}}
  const distribution = {};
  partNames.forEach(name => {
    const scores = parts[name].scores || [];
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    distribution[name] = { name, activePct: avg };
  });

  // EmotionTimeline: flatten all emotion_timeline entries
  const emotionData = [];
  partNames.forEach(name => {
    (parts[name].emotion_timeline || []).forEach(e => emotionData.push(e));
  });
  emotionData.sort((a, b) => (a.ts || 0) - (b.ts || 0));

  // TalkTime / AwayTime
  const talkTimes = {};
  const awayTimes = {};
  partNames.forEach(name => {
    talkTimes[name] = parts[name].talk_time_ms || 0;
    awayTimes[name] = parts[name].away_time_ms || 0;
  });

  // Participant tiles
  const participantList = partNames.map(name => {
    const p = parts[name];
    const scores = p.scores || [];
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const attnCounts = p.attention_counts || {};
    const totalAttn = Object.values(attnCounts).reduce((a, b) => a + b, 0) || 1;
    const focusedPct = Math.round((attnCounts.focused || 0) / totalAttn * 100);
    return {
      id: name,
      name,
      activePct: avg,
      talkTimeMs: p.talk_time_ms || 0,
      awayTimeMs: p.away_time_ms || 0,
      visibleTimeMs: p.visible_time_ms || 0,
      listeningTimeMs: p.listening_time_ms || 0,
      emotionTimes: p.emotion_times || {},
      lastMetrics: {
        emotion: Object.entries(p.emotions || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral',
        attentionState: Object.entries(attnCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
        gazeScore: p.avg_gaze_score || null,
      },
      focusedPct,
      drowsinessIncidents: p.drowsiness_incidents || 0,
      attentionCounts: attnCounts,
    };
  });

  const fmtDate = ts => ts ? new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }) + ' ' + new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="detail-back" onClick={onBack}>&larr; Back to Dashboard</button>
        <div className="detail-title-row">
          <span className="meeting-id-badge" style={{ fontSize: 15, padding: '4px 14px' }}>{meetingId}</span>
          <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 14 }}>
            {data.hostName} &middot; {fmtDate(data.startTime)}
          </span>
          {!data.endedAt && (
            <span className="meeting-live" style={{ fontSize: 12 }}>
              <span className="live-dot" /> LIVE
            </span>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="summary-stats" style={{ maxWidth: 600, margin: '0 auto 20px' }}>
        <div className="summary-stat-card">
          <div className="stat-label">Duration</div>
          <div className="stat-value">{durationMin}m {durationSec}s</div>
        </div>
        <div className="summary-stat-card">
          <div className="stat-label">Participants</div>
          <div className="stat-value" style={{ color: '#818cf8' }}>{partNames.length}</div>
        </div>
        <div className="summary-stat-card">
          <div className="stat-label">Avg Engagement</div>
          <div className="stat-value" style={{ color: '#34a853' }}>{avgEngagement}%</div>
        </div>
      </div>

      {/* Participants */}
      {participantList.length > 0 && (
        <div className="monitor-card" style={{ marginBottom: 16 }}>
          <h3 className="monitor-card-title">Participants ({partNames.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {participantList.map(p => <ParticipantTile key={p.id} participant={p} />)}
          </div>
        </div>
      )}

      {/* v6: Attention Overview */}
      {participantList.some(p => Object.keys(p.attentionCounts || {}).length > 0) && (
        <div className="monitor-card" style={{ marginBottom: 16 }}>
          <h3 className="monitor-card-title">Attention Distribution</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {participantList.filter(p => Object.keys(p.attentionCounts || {}).length > 0).map(p => {
              const total = Object.values(p.attentionCounts).reduce((a, b) => a + b, 0) || 1;
              return (
                <div key={p.name} style={{ background: 'rgba(255,255,255,.03)', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#fff' }}>{p.name}</div>
                  {['focused', 'distracted', 'drowsy', 'away'].map(state => {
                    const pct = Math.round((p.attentionCounts[state] || 0) / total * 100);
                    const colors = { focused: '#34a853', distracted: '#f9ab00', drowsy: '#ea4335', away: '#9aa0a6' };
                    return (
                      <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, width: 65, textTransform: 'capitalize', color: colors[state] }}>{state}</span>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: colors[state], borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', minWidth: 28 }}>{pct}%</span>
                      </div>
                    );
                  })}
                  {p.drowsinessIncidents > 0 && (
                    <div style={{ fontSize: 10, color: '#ea4335', marginTop: 4 }}>
                      {p.drowsinessIncidents} drowsiness incident{p.drowsinessIncidents !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart grid */}
      <div className="monitor-grid">
        <div className="monitor-card">
          <h3 className="monitor-card-title">Engagement Trend</h3>
          <TrendChart data={trendSampled} />
        </div>

        <div className="monitor-card">
          <h3 className="monitor-card-title">Distribution</h3>
          <DistributionChart participants={distribution} />
        </div>

        <div className="monitor-card">
          <h3 className="monitor-card-title">Emotion Timeline</h3>
          <EmotionTimeline data={emotionData} />
        </div>

        <div className="monitor-card">
          <h3 className="monitor-card-title">Talk Time</h3>
          <TalkTimeChart data={talkTimes} />
        </div>

        <div className="monitor-card">
          <h3 className="monitor-card-title">Away Time</h3>
          <AwayTimeChart data={awayTimes} />
        </div>

        {(data.transcript || []).length > 0 && (
          <div className="monitor-card">
            <h3 className="monitor-card-title">Transcript</h3>
            <TranscriptPanel lines={data.transcript} />
          </div>
        )}
      </div>
    </div>
  );
}
