import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const EMOTION_COLORS = {
  happy:     '#34a853',
  neutral:   '#9aa0a6',
  surprised: '#f9ab00',
  sad:       '#3b82f6',
  angry:     '#ea4335',
  fearful:   '#a78bfa',
  disgusted: '#78716c',
};

const EMOTION_VALUE = {
  happy: 6, surprised: 5, neutral: 4, fearful: 3, sad: 2, angry: 1, disgusted: 0,
};

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#1a1a24', border: '1px solid rgba(99,102,241,.3)', borderRadius: 8,
                  padding: '8px 12px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,.4)' }}>
      <span style={{ color: EMOTION_COLORS[d.emotion] || '#9aa0a6', textTransform: 'capitalize', fontWeight: 600 }}>
        {d.emotion}
      </span>
      <span style={{ color: 'rgba(255,255,255,.4)', marginLeft: 8 }}>{d.label}</span>
    </div>
  );
};

export default function EmotionTimeline({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#9aa0a6', fontSize: 14 }}>
        Waiting for emotion data...
      </div>
    );
  }

  const step = Math.max(1, Math.floor(data.length / 60));
  const series = data
    .filter((_, i) => i % step === 0)
    .slice(-60)
    .map((d) => {
      const sec = Math.floor((d.ts - data[0].ts) / 1000);
      return {
        label: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`,
        value: EMOTION_VALUE[d.emotion] ?? 4,
        emotion: d.emotion,
      };
    });

  return (
    <div style={{ width: '100%', height: 210 }}>
      <ResponsiveContainer>
        <LineChart data={series} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,.4)', fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            domain={[0, 6]}
            ticks={[0, 1, 2, 3, 4, 5, 6]}
            tickFormatter={v => ['disgusted','angry','sad','fearful','neutral','surprised','happy'][v] || ''}
            tick={{ fill: 'rgba(255,255,255,.4)', fontSize: 10 }}
            axisLine={false} tickLine={false} width={70}
          />
          <Tooltip content={<Tip />} />
          <Line
            type="stepAfter" dataKey="value" stroke="#6366f1" strokeWidth={2.5}
            dot={false} isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
