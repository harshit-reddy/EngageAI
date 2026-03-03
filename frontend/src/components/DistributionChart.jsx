import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1a1a24', border:'1px solid rgba(59,130,246,.3)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#60a5fa', boxShadow:'0 4px 16px rgba(0,0,0,.4)' }}>
      {label}: {payload[0].value} participant{payload[0].value !== 1 ? 's' : ''}
    </div>
  );
};

export default function DistributionChart({ participants }) {
  const scores = Object.values(participants).map(p => p.activePct ?? 0);

  const bins = [
    { label: 'High (80-100%)',  count: scores.filter(s => s >= 80).length },
    { label: 'Medium (60-79%)', count: scores.filter(s => s >= 60 && s < 80).length },
    { label: 'Low (0-59%)',     count: scores.filter(s => s < 60).length  },
  ];

  return (
    <div style={{ width:'100%', height:210 }}>
      <ResponsiveContainer>
        <BarChart data={bins} margin={{ top:6, right:16, bottom:0, left:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill:'rgba(255,255,255,.4)', fontSize:11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill:'rgba(255,255,255,.4)', fontSize:12 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip content={<Tip />} cursor={{ fill:'rgba(255,255,255,.03)' }} />
          <Bar dataKey="count" radius={[6,6,0,0]}>
            {bins.map((_, i) => <Cell key={i} fill="#3b82f6" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
