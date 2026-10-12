import { useState } from 'react';
import { CITIES, CITY_BY_ID, METRICS, summary, zonesOf } from '../data/dataSource';
import CityCard from '../components/CityCard';
import LineChart from '../components/LineChart';
import SimBadge from '../components/SimBadge';
const COL = ['#38bdf8', '#fb923c'];
// Compare two cities: summary cards, one overlaid chart per indicator, and a difference table.
export default function ComparePage({ city, alerts, now, range, effNow }) {
  const [ids, setIds] = useState([city, city === 'coimbatore' ? 'chennai' : 'coimbatore']);
  const set = (i) => (e) => setIds(ids.map((x, j) => (j === i ? e.target.value : x)));
  const [A, B] = ids.map((id) => CITY_BY_ID[id]), nm = (c) => c.short || c.name;
  const rows = Object.keys(METRICS).map((m) => { const a = summary(zonesOf(A.id), m, range, effNow), b = summary(zonesOf(B.id), m, range, effNow);
    return { m, a, b, diff: a.avg ? ((b.avg - a.avg) / a.avg) * 100 : 0 }; });
  return (
    <>
      <div className="card section">
        <div className="card-h"><h3>Choose two cities</h3><SimBadge /></div>
        <div className="filters">{ids.map((v, i) => <select key={i} value={v} onChange={set(i)} aria-label={`City ${i + 1}`}>{CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>)}</div>
        {A.id === B.id && <div className="err" style={{ marginTop: 8 }}>Both selections are the same city. Pick two different cities to see differences.</div>}
      </div>
      <div className="pair">{[A, B].map((c) => <CityCard key={c.id} city={c} now={now} alerts={alerts} />)}</div>
      <div className="charts">
        {rows.map(({ m, a, b, diff }) => (
          <div className="card" key={m}>
            <div className="card-h"><h3>{METRICS[m].label} <span className="muted">{m === 'energy' ? 'total kW' : METRICS[m].unit}</span></h3><SimBadge /></div>
            <LineChart range={range} series={[{ name: nm(A), color: COL[0], data: a.data }, { name: nm(B), color: COL[1], data: b.data }]} />
            <div className="muted">Average: {nm(A)} {a.avg.toFixed(1)} · {nm(B)} {b.avg.toFixed(1)} ({diff >= 0 ? '+' : ''}{diff.toFixed(1)}% for {nm(B)})</div>
          </div>))}
      </div>
      <div className="card section"><div className="card-h"><h3>Summary of differences</h3><SimBadge /></div>
        <div className="scroll"><table className="tbl"><thead><tr><th>Indicator</th><th>{nm(A)} avg</th><th>{nm(B)} avg</th><th>{nm(B)} vs {nm(A)}</th><th>Peak {nm(A)}</th><th>Peak {nm(B)}</th></tr></thead>
          <tbody>{rows.map(({ m, a, b, diff }) => <tr key={m}><td>{METRICS[m].label}{m === 'energy' ? ' (total)' : ''}</td><td>{a.avg.toFixed(1)}</td><td>{b.avg.toFixed(1)}</td><td>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}%</td><td>{a.peak.toFixed(1)}</td><td>{b.peak.toFixed(1)}</td></tr>)}</tbody></table></div>
        <div className="muted" style={{ marginTop: 8 }}>Energy totals depend on each city's illustrative zone baselines. All values are simulated.</div></div>
    </>
  );
}
