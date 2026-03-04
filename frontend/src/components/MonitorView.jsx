import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { SERVER } from '../api';
import ParticipantTile from './ParticipantTile';
import TrendChart from './TrendChart';
import DistributionChart from './DistributionChart';
import EmotionTimeline from './EmotionTimeline';
import TalkTimeChart from './TalkTimeChart';
import AwayTimeChart from './AwayTimeChart';
import TranscriptPanel from './TranscriptPanel';
import MonitorControls from './monitor/MonitorControls';
import ParticipantDetail from './monitor/ParticipantDetail';

/**
 * Full-page analytics monitor — opens in a new browser tab.
 * Connects via Socket.IO as role "monitor" to receive real-time data.
 * Two-column layout: left (dashboard) + right (participant detail).
 */
export default function MonitorView({ meetingId, userName }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState({});
  const [trendData, setTrendData] = useState([]);
  const [emotionData, setEmotionData] = useState([]);
  const [talkTimes, setTalkTimes] = useState({});
  const [awayTimes, setAwayTimes] = useState({});
  const [emotionTimes, setEmotionTimes] = useState({});
  const [visibleTimes, setVisibleTimes] = useState({});
  const [listeningTimes, setListeningTimes] = useState({});
  const [analysisStopped, setAnalysisStopped] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [attentionData, setAttentionData] = useState({});
  const [drowsinessAlerts, setDrowsinessAlerts] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const startRef = useRef(Date.now());

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Socket.IO connection
  useEffect(() => {
    const socket = io(SERVER || undefined, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', { meetingId, role: 'monitor', name: userName });
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('audienceEngagement', ({ participantId, name, metrics, activePct }) => {
      setParticipants(prev => ({
        ...prev,
        [participantId]: { name, activePct, lastMetrics: metrics },
      }));
      setTrendData(prev => [...prev, { time: new Date().toISOString(), engagement: activePct }].slice(-360));
      if (metrics?.emotion) {
        setEmotionData(prev => [...prev, { ts: metrics.ts || Date.now(), emotion: metrics.emotion }].slice(-500));
      }
      if (name && metrics?.audioLevel > 15) {
        setTalkTimes(prev => ({ ...prev, [name]: (prev[name] || 0) + 1000 }));
      }
      if (name && !metrics?.faceDetected && !metrics?.videoOff) {
        setAwayTimes(prev => ({ ...prev, [name]: (prev[name] || 0) + 1000 }));
      }
      if (name && metrics?.emotion) {
        setEmotionTimes(prev => {
          const pEmo = { ...(prev[name] || {}) };
          pEmo[metrics.emotion] = (pEmo[metrics.emotion] || 0) + 1000;
          return { ...prev, [name]: pEmo };
        });
      }
      if (name && metrics?.faceDetected) {
        setVisibleTimes(prev => ({ ...prev, [name]: (prev[name] || 0) + 1000 }));
        if (metrics.audioLevel <= 15 && !metrics.videoOff) {
          setListeningTimes(prev => ({ ...prev, [name]: (prev[name] || 0) + 1000 }));
        }
      }
      if (name && metrics?.attentionState) {
        setAttentionData(prev => {
          const pAttn = { ...(prev[name] || { focused: 0, distracted: 0, drowsy: 0, away: 0 }) };
          pAttn[metrics.attentionState] = (pAttn[metrics.attentionState] || 0) + 1;
          return { ...prev, [name]: pAttn };
        });
      }
      if (name && metrics?.drowsinessScore > 0.5) {
        setDrowsinessAlerts(prev => [{
          name, score: Math.round(metrics.drowsinessScore * 100), ts: Date.now()
        }, ...prev].slice(0, 10));
      }
    });

    socket.on('transcript_line', line => setTranscript(prev => [...prev, line]));
    socket.on('newFeedback', item => setFeedback(prev => [item, ...prev]));
    socket.on('alert', a => setAlerts(prev => [a, ...prev].slice(0, 10)));

    socket.on('roomUpdate', ({ participants: list }) => {
      if (list) {
        const activeIds = new Set(list.map(p => p.id));
        setParticipants(prev =>
          Object.fromEntries(Object.entries(prev).filter(([id]) => activeIds.has(id)))
        );
      }
    });

    socket.on('sessionEnded', () => {});
    socket.on('monitoring_stopped', () => setAnalysisStopped(true));
    socket.on('monitoring_started', () => setAnalysisStopped(false));

    axios.get(`${SERVER}/feedback/${meetingId}`)
      .then(r => setFeedback(r.data.feedback.slice().reverse()))
      .catch(() => {});

    return () => socket.disconnect();
  }, [meetingId, userName]);

  const audience = Object.entries(participants).map(([id, p]) => ({
    id, ...p,
    talkTimeMs: talkTimes[p.name] || 0,
    awayTimeMs: awayTimes[p.name] || 0,
    visibleTimeMs: visibleTimes[p.name] || 0,
    listeningTimeMs: listeningTimes[p.name] || 0,
    emotionTimes: emotionTimes[p.name] || {},
  }));
  const scores = audience.map(p => p.activePct || 0);
  const overall = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const overallLabel = overall >= 80 ? 'High' : overall >= 60 ? 'Moderate' : overall >= 30 ? 'Low' : 'Waiting...';
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Get selected participant data
  const selectedData = selectedParticipant ? participants[selectedParticipant] : null;

  return (
    <div className="monitor-page">
      {/* Header */}
      <div className="monitor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>EngageAI Monitor</span>
          <span className="meeting-id-badge">{meetingId}</span>
          <span className="meeting-timer">{fmt(elapsed)}</span>
          {connected && !analysisStopped && (
            <span className="monitor-live-indicator">
              <span className="monitor-live-dot" /> ANALYZING
            </span>
          )}
          {analysisStopped && (
            <span className="monitor-stopped-indicator">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea4335', display: 'inline-block' }} /> PAUSED
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <MonitorControls
            meetingId={meetingId}
            analysisStopped={analysisStopped}
            onStatusChange={setAnalysisStopped}
          />
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>
            {audience.length} participant{audience.length !== 1 ? 's' : ''} tracked
          </span>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="alert-bar">
          {alerts.slice(0, 3).map((a, i) => (
            <div key={i} className="alert-item">
              <span>&#9888;</span> {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div className="monitor-layout">
        {/* Left — Dashboard */}
        <div className="monitor-main">
          <div className="monitor-grid">
            {/* Overall engagement */}
            <div className="monitor-card" style={{ gridColumn: '1 / -1' }}>
              <div className="overall-engagement">
                <div className="overall-score">{overall}%</div>
                <div className="overall-bar">
                  <div className="overall-bar-fill" style={{ width: `${overall}%` }} />
                </div>
                <div className="overall-label">{overallLabel} Engagement</div>
              </div>
            </div>

            {/* Participants — clickable */}
            {audience.length > 0 && (
              <div className="monitor-card" style={{ gridColumn: '1 / -1' }}>
                <h3 className="monitor-card-title">Participants ({audience.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                  {audience.map(p => (
                    <div
                      key={p.id}
                      className={`monitor-participant-wrapper ${selectedParticipant === p.id ? 'selected' : ''}`}
                      onClick={() => setSelectedParticipant(selectedParticipant === p.id ? null : p.id)}
                    >
                      <ParticipantTile participant={p} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="monitor-card">
              <h3 className="monitor-card-title">Engagement Trend</h3>
              <TrendChart data={trendData} />
            </div>

            <div className="monitor-card">
              <h3 className="monitor-card-title">Distribution</h3>
              <DistributionChart participants={participants} />
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

            {/* Attention Overview */}
            {Object.keys(attentionData).length > 0 && (
              <div className="monitor-card" style={{ gridColumn: '1 / -1' }}>
                <h3 className="monitor-card-title">Attention Distribution</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {Object.entries(attentionData).map(([name, counts]) => {
                    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
                    return (
                      <div key={name} style={{
                        background: 'rgba(255,255,255,.03)', borderRadius: 8, padding: '10px 14px',
                        border: '1px solid rgba(255,255,255,.06)',
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#fff' }}>{name}</div>
                        {['focused', 'distracted', 'drowsy', 'away'].map(state => {
                          const pct = Math.round((counts[state] || 0) / total * 100);
                          const colors = { focused: '#34a853', distracted: '#f9ab00', drowsy: '#ea4335', away: '#9aa0a6' };
                          return (
                            <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 11, width: 65, textTransform: 'capitalize', color: colors[state] }}>{state}</span>
                              <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: colors[state], borderRadius: 3, transition: 'width .4s' }} />
                              </div>
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', minWidth: 28 }}>{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Drowsiness Alerts */}
            {drowsinessAlerts.length > 0 && (
              <div className="monitor-card">
                <h3 className="monitor-card-title">Drowsiness Alerts</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                  {drowsinessAlerts.slice(0, 8).map((a, i) => (
                    <div key={i} style={{
                      background: 'rgba(234,67,53,.1)', border: '1px solid rgba(234,67,53,.25)',
                      borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#f87171',
                    }}>
                      <strong>{a.name}</strong> — drowsiness {a.score}%
                      <span style={{ float: 'right', color: 'rgba(255,255,255,.4)', fontSize: 10 }}>
                        {new Date(a.ts).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transcript */}
            <div className="monitor-card">
              <h3 className="monitor-card-title">Live Transcript</h3>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <TranscriptPanel lines={transcript} />
              </div>
            </div>

            {/* Feedback */}
            <div className="monitor-card" style={{ gridColumn: '1 / -1' }}>
              <h3 className="monitor-card-title">Private Feedback</h3>
              {feedback.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 13 }}>No feedback received yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {feedback.map(f => (
                    <div key={f.id} style={{
                      background: 'rgba(52,168,83,.08)', border: '1px solid rgba(52,168,83,.2)', borderRadius: 8,
                      padding: '8px 12px', fontSize: 13, color: '#e0e0e0',
                    }}>
                      <div>{f.message}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 3 }}>
                        {f.from} &middot; {new Date(f.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — Participant Detail */}
        <div className="monitor-sidebar">
          {selectedData ? (
            <ParticipantDetail
              participant={selectedData}
              onClose={() => setSelectedParticipant(null)}
            />
          ) : (
            <div className="monitor-sidebar-empty">
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>&#128100;</div>
              <div style={{ fontWeight: 600, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>Select a participant</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>Click on a participant tile to see their detailed metrics</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
