import React from 'react';
import EmotionConfidenceChart from './EmotionConfidenceChart';
import FeatureVisualization from './FeatureVisualization';
import FaceLandmarkCanvas from './FaceLandmarkCanvas';
import EngagementBreakdown from './EngagementBreakdown';

export default function ParticipantDetail({ participant, onClose }) {
  if (!participant) return null;

  const { name, lastMetrics, activePct } = participant;
  const m = lastMetrics || {};
  const engagement = m.engagementScore ?? activePct ?? 0;
  const emotion = m.emotion || 'neutral';
  const confidence = m.emotionConfidence || 0;
  const attention = m.attentionState || 'away';
  const features = m.features || {};
  const emotionScores = m.emotionScores || {};
  const landmarks = m.landmarks || [];
  const drowsiness = m.drowsinessScore || 0;
  const blinkRate = m.blinkRate || 0;
  const gazeScore = m.gazeScore || 0;
  const featureImportances = m.featureImportances || [];

  const engColor = engagement >= 60 ? 'var(--green)' : engagement >= 30 ? 'var(--yellow)' : 'var(--red)';
  const attnColors = { focused: '#34a853', distracted: '#f9ab00', drowsy: '#ea4335', away: '#9aa0a6' };

  return (
    <div className="participant-detail">
      <div className="pd-header">
        <h3>{name}</h3>
        <button className="side-panel-close" onClick={onClose}>&times;</button>
      </div>

      <div className="pd-body">
        {/* Face landmark visualization — ML analysis panel */}
        <div className="pd-section pd-face-analysis">
          <div className="pd-face-header">
            <span className="pd-face-title">
              <span className={`pd-track-dot ${landmarks.length > 0 ? 'active' : ''}`} />
              Face Mesh Analysis
            </span>
            <span className="pd-landmark-count">
              {landmarks.length > 0 ? `${landmarks.length} landmarks` : 'No face'}
            </span>
          </div>
          <FaceLandmarkCanvas landmarks={landmarks} width={280} height={210} />
          {landmarks.length > 0 && (
            <div className="pd-face-stats">
              <span>Eyes: <b style={{color:'#00b4ff'}}>tracking</b></span>
              <span>Iris: <b style={{color:'#00e6ff'}}>{landmarks.length > 477 ? 'detected' : '—'}</b></span>
              <span>Gaze: <b style={{color:'#00ffaa'}}>{gazeScore.toFixed(2)}</b></span>
            </div>
          )}
        </div>

        {/* Engagement score */}
        <div className="pd-section pd-engagement">
          <div className="pd-score" style={{ color: engColor }}>{engagement}%</div>
          <div className="pd-score-label">Engagement</div>
          <div className="pd-bar">
            <div className="pd-bar-fill" style={{ width: `${engagement}%`, background: engColor }} />
          </div>
        </div>

        {/* Attention state */}
        <div className="pd-section">
          <div className="pd-label">Attention</div>
          <span className="pd-attention-badge" style={{ background: attnColors[attention] || '#9aa0a6' }}>
            {attention}
          </span>
        </div>

        {/* Current emotion + confidence */}
        <div className="pd-section">
          <div className="pd-label">Emotion</div>
          <div className="pd-emotion-row">
            <span className="pd-emotion-name">{emotion}</span>
            <span className="pd-emotion-conf">{Math.round(confidence * 100)}% confident</span>
          </div>
        </div>

        {/* All 9 emotion scores */}
        {Object.keys(emotionScores).length > 0 && (
          <div className="pd-section">
            <div className="pd-label">Emotion Scores</div>
            <EmotionConfidenceChart scores={emotionScores} currentEmotion={emotion} />
          </div>
        )}

        {/* Key metrics */}
        <div className="pd-section pd-metrics-grid">
          <div className="pd-metric">
            <span className="pd-metric-val">{gazeScore.toFixed(2)}</span>
            <span className="pd-metric-lbl">Gaze Score</span>
          </div>
          <div className="pd-metric">
            <span className="pd-metric-val">{blinkRate}</span>
            <span className="pd-metric-lbl">Blink Rate</span>
          </div>
          <div className="pd-metric">
            <span className="pd-metric-val">{Math.round(drowsiness * 100)}%</span>
            <span className="pd-metric-lbl">Drowsiness</span>
            <div className="pd-mini-bar">
              <div className="pd-mini-bar-fill" style={{
                width: `${drowsiness * 100}%`,
                background: drowsiness > 0.4 ? 'var(--red)' : drowsiness > 0.2 ? 'var(--yellow)' : 'var(--green)'
              }} />
            </div>
          </div>
          <div className="pd-metric">
            <span className="pd-metric-val">{m.speechPace || 'silent'}</span>
            <span className="pd-metric-lbl">Speech Pace</span>
          </div>
        </div>

        {/* Engagement breakdown (feature importance) */}
        {featureImportances.length > 0 && Object.keys(features).length > 0 && (
          <div className="pd-section">
            <div className="pd-label">Engagement Factors</div>
            <EngagementBreakdown features={features} featureImportances={featureImportances} />
          </div>
        )}

        {/* Feature values */}
        {Object.keys(features).length > 0 && (
          <div className="pd-section">
            <div className="pd-label">Feature Values</div>
            <FeatureVisualization features={features} />
          </div>
        )}
      </div>
    </div>
  );
}
