import React from 'react';

const FEATURE_CONFIG = {
  eye_aspect_ratio: { label: 'EAR', min: 0, max: 0.5, warn: 0.21, warnDir: 'below' },
  mouth_aspect_ratio: { label: 'MAR', min: 0, max: 0.6 },
  smile_ratio: { label: 'Smile', min: 0, max: 1 },
  brow_raise_ratio: { label: 'Brow', min: 0, max: 1 },
  head_yaw: { label: 'Yaw', min: -0.5, max: 0.5 },
  head_pitch: { label: 'Pitch', min: -0.5, max: 0.5 },
  gaze_score: { label: 'Gaze', min: 0, max: 1 },
  blink_rate: { label: 'Blinks', min: 0, max: 40 },
  drowsiness: { label: 'Drowsy', min: 0, max: 1, warn: 0.4, warnDir: 'above' },
  head_velocity: { label: 'Head Vel', min: 0, max: 2 },
};

export default function FeatureVisualization({ features }) {
  return (
    <div className="feature-viz">
      {Object.entries(features).map(([key, value]) => {
        const cfg = FEATURE_CONFIG[key];
        if (!cfg) return null;
        const range = cfg.max - cfg.min;
        const pct = Math.max(0, Math.min(100, ((value - cfg.min) / range) * 100));
        const isWarn = cfg.warn != null && (
          (cfg.warnDir === 'below' && value < cfg.warn) ||
          (cfg.warnDir === 'above' && value > cfg.warn)
        );

        return (
          <div key={key} className={`feature-row ${isWarn ? 'warn' : ''}`}>
            <span className="feature-label">{cfg.label}</span>
            <div className="feature-bar-track">
              <div className="feature-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="feature-value">{typeof value === 'number' ? value.toFixed(3) : value}</span>
          </div>
        );
      })}
    </div>
  );
}
