import { useState } from 'react';
import { METRICS, series, statusOf } from '../data/dataSource';
import { PALETTE } from './Charts';
import LineChart from './LineChart';
import SimBadge from './SimBadge';
import StatusPill from './StatusPill';
// Compare any zones on one metric: overlaid chart + ranking table.
export default function ZoneCompare({ zones: ZONES, range, now }) {
  const [ids, setIds] = useState(() => ZONES.slice(0, 3).map((z) => z.id)), [metric, setMetric] = useState('congestion');
  const toggle = (id) => setIds((c) => (c.includes(id) ? (c.length > 1 ? c.filter((x) => x !== id) : c) : [...c, id]));
  const M = METRICS[metric], picked = ZONES.filter((z) => ids.includes(z.id));
  const lines = picked.map((z) => ({ name: z.name, color: PALETTE[ZONES.indexOf(z)], data: series(z, metric, range, now) }));
  const rows = lines.map((l, i) => { const v = l.data.map((p) => p.v), cur = v[v.length - 1];
    return { name: l.name, color: l.color, cur, avg: v.reduce((a, b) => a + b, 0) / v.length, peak: Math.max(...v), status: statusOf(picked[i], metric, cur) }; }).sort((a, b) => b.cur - a.cur);
  const top = Math.max(...rows.map((r) => r.cur)) || 1;
  return (
    <div className="card section">
      <div className="card-h"><h3>Zone comparison</h3>
        <div className="row-gap"><select value={metric} onChange={(e) => setMetric(e.target.value)} aria-label="Metric to compare">{Object.entries(METRICS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select><SimBadge /></div></div>
      <div className="chips">{ZONES.map((z, i) => <button key={z.id} className={ids.includes(z.id) ? 'on' : ''} onClick={() => toggle(z.id)}><i style={{ background: PALETTE[i] }} />{z.name}</button>)}</div>
      <LineChart series={lines} range={range} />
      <div className="rank">
        {rows.map((r) => (
          <div key={r.name} className="rank-row"><span className="rk-n"><i className="dot" style={{ background: r.color }} />{r.name}</span>
            <div className="bar"><i style={{ width: `${(r.cur / top) * 100}%`, background: r.color }} /></div>
            <b>{r.cur.toFixed(1)}{M.unit}</b><span className="muted rk-m">avg {r.avg.toFixed(1)} · peak {r.peak.toFixed(1)}</span><StatusPill status={r.status} /></div>))}
      </div>
    </div>
  );
}
