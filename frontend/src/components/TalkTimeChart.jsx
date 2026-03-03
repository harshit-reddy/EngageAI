import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#34a853', '#f9ab00', '#ea4335', '#ec4899'];

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const mins = Math.floor(d.seconds / 60);
  const secs = d.seconds % 60;
  return (
    <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8,
                  padding: '8px 12px', fontSize: 13, color: '#e0e0e0', boxShadow: '0 4px 16px rgba(0,0,0,.4)' }}>
      <strong>{d.name}</strong>: {mins}m {secs}s
    </div>
  );
};

export default function TalkTimeChart({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#9aa0a6', fontSize: 14 }}>
        Waiting for talk time data...
      </div>
    );
  }

  const series = Object.entries(data).map(([name, ms]) => ({
    name: name.length > 12 ? name.slice(0, 12) + '...' : name,
    seconds: Math.round(ms / 1000),
  }));

  return (
    <div style={{ width: '100%', height: Math.max(210, series.length * 40 + 40) }}>
      <ResponsiveContainer>
        <BarChart data={series} layout="vertical" margin={{ top: 6, right: 16, bottom: 0, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#9aa0a6', fontSize: 12 }} axisLine={false} tickLine={false}
                 tickFormatter={v => `${Math.floor(v / 60)}m`} />
          <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,.6)', fontSize: 12 }}
                 axisLine={false} tickLine={false} width={60} />
          <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,.03)' }} />
          <Bar dataKey="seconds" radius={[0, 6, 6, 0]} barSize={20}>
            {series.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
