import React from 'react';

const FEATURE_NAMES = [
  'Face Detected', 'Eye Aspect Ratio', 'Smile', 'Head Yaw',
  'Head Pitch', 'Audio Level', 'Gaze Score', 'Blink Rate',
  'Head Velocity', 'Drowsiness',
];

export default function EngagementBreakdown({ features, featureImportances }) {
  if (!features || !featureImportances || featureImportances.length === 0) return null;

  const featureValues = [
    features.eye_aspect_ratio || 0,
    features.smile_ratio || 0,
    Math.abs(features.head_yaw || 0),
    Math.abs(features.head_pitch || 0),
    0, // audio level normalized
    features.gaze_score || 0,
    features.blink_rate || 0,
    features.head_velocity || 0,
    features.drowsiness || 0,
  ];

  // Pair importance with name, skip face_detected (index 0)
  const items = featureImportances.slice(1).map((imp, i) => ({
    name: FEATURE_NAMES[i + 1],
    importance: imp,
    value: featureValues[i] || 0,
  })).sort((a, b) => b.importance - a.importance);

  const maxImp = Math.max(...items.map(i => i.importance), 0.01);

  return (
    <div className="engagement-breakdown">
      {items.map(item => (
        <div key={item.name} className="eb-row">
          <span className="eb-name">{item.name}</span>
          <div className="eb-bar-track">
            <div className="eb-bar-fill" style={{ width: `${(item.importance / maxImp) * 100}%` }} />
          </div>
          <span className="eb-val">{(item.importance * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}
