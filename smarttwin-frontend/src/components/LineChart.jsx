import { useState } from 'react';
import { fmtTime } from '../utils/format';
const W = 640;
// Dependency-free SVG line chart. compact = sparkline. limits = {warn, crit} threshold lines.
export default function LineChart({ series: allSeries, height = 230, range = '24h', limits, compact = false }) {
  const [hov, setHov] = useState(null);
  const [off, setOff] = useState([]); // legend toggles: click a name to hide or show its line
  const vis = allSeries.filter((s) => !off.includes(s.name)), series = vis.length ? vis : allSeries;
  const toggle = (name) => setOff((o) => (o.includes(name) ? o.filter((x) => x !== name) : allSeries.length - o.length > 1 ? [...o, name] : o));
  const H = height, p = compact ? { l: 0, r: 0, t: 4, b: 4 } : { l: 44, r: 12, t: 12, b: 26 };
  const vals = series.flatMap((s) => s.data.map((d) => d.v));
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo || 1) * 0.12; lo -= pad; hi += pad;
  const n = series[0].data.length, iw = W - p.l - p.r;
  const x = (i) => p.l + (i / (n - 1)) * iw, y = (v) => p.t + (1 - (v - lo) / (hi - lo)) * (H - p.t - p.b);
  const path = (d) => d.map((q, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(q.v).toFixed(1)}`).join('');
  const move = (e) => { const r = e.currentTarget.getBoundingClientRect(); setHov(Math.max(0, Math.min(n - 1, Math.round(((((e.clientX - r.left) / r.width) * W - p.l) / iw) * (n - 1))))); };
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={compact ? undefined : move} onMouseLeave={() => setHov(null)}>
        {!compact && [0, 1, 2, 3].map((k) => { const v = lo + ((hi - lo) * k) / 3; return (
          <g key={k}><line x1={p.l} x2={W - p.r} y1={y(v)} y2={y(v)} className="grid" /><text x={p.l - 6} y={y(v) + 4} textAnchor="end" className="axis">{Math.round(v)}</text></g>); })}
        {!compact && [0, 0.25, 0.5, 0.75, 1].map((f) => { const i = Math.round(f * (n - 1)); return (
          <text key={f} x={x(i)} y={H - 6} textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'} className="axis">{fmtTime(series[0].data[i].t, range)}</text>); })}
        {!compact && limits && [['warn', '#f59e0b'], ['crit', '#ef4444']].map(([k, c]) => limits[k] > lo && limits[k] < hi && (
          <line key={k} x1={p.l} x2={W - p.r} y1={y(limits[k])} y2={y(limits[k])} stroke={c} strokeDasharray="5 4" opacity=".8" />))}
        {series.map((s) => <path key={s.name} d={path(s.data)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />)}
        {hov !== null && !compact && <line x1={x(hov)} x2={x(hov)} y1={p.t} y2={H - p.b} stroke="#8a9bc4" strokeDasharray="3 3" />}
        {hov !== null && !compact && series.map((s) => <circle key={s.name} cx={x(hov)} cy={y(s.data[hov].v)} r="4" fill={s.color} />)}
      </svg>
      {hov !== null && !compact && (
        <div className="tip" style={{ left: `${Math.min(70, (x(hov) / W) * 100)}%` }}>
          <b>{fmtTime(series[0].data[hov].t, range)}</b>
          {series.map((s) => <div key={s.name}><i style={{ background: s.color }} />{s.name}: {s.data[hov].v.toFixed(1)}</div>)}
        </div>)}
      {!compact && allSeries.length > 1 && <div className="legend">{allSeries.map((s) => <button key={s.name} className={off.includes(s.name) ? 'off' : ''} onClick={() => toggle(s.name)} title="Click to show or hide this line"><i style={{ background: s.color }} />{s.name}</button>)}</div>}
    </div>
  );
}
