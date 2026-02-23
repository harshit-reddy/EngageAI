import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1e2433', border:'1px solid #30363d', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#a78bfa' }}>
      {payload[0].value}%
    </div>
  );
};

export default function TrendChart({ data }) {
  const bySecond = {};
  data.forEach(d => {
    const key = String(d.time).slice(0, 19);
    bySecond[key] ??= { sum: 0, n: 0 };
    bySecond[key].sum += d.engagement;
    bySecond[key].n   += 1;
  });

  const total  = Object.keys(bySecond).length;
  const series = Object.entries(bySecond)
    .sort(([a], [b]) => a < b ? -1 : 1)
    .slice(-60)
    .map(([, v], i, arr) => ({
      label:      total > 1 ? `${Math.round(((i + 1) / arr.length) * 5)}m` : '0m',
      engagement: Math.round(v.sum / v.n),
    }));

  if (!series.length) {
    return (
      <div style={{ height:210, display:'flex', alignItems:'center', justifyContent:'center', color:'#374151', fontSize:14 }}>
        Waiting for participants...
      </div>
    );
  }

  return (
    <div style={{ width:'100%', height:210 }}>
      <ResponsiveContainer>
        <LineChart data={series} margin={{ top:6, right:16, bottom:0, left:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
          <XAxis dataKey="label" tick={{ fill:'#6b7280', fontSize:12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0,100]} tick={{ fill:'#6b7280', fontSize:12 }} axisLine={false} tickLine={false} width={30} />
          <Tooltip content={<Tip />} />
          <Line type="monotone" dataKey="engagement" stroke="#a78bfa" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
