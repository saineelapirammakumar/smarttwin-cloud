import { METRICS, SENSOR_METRICS, series, sensorHealth, lastSeen, statusOf } from '../data/dataSource';
import { ago, fmtDateTime, fmtTime } from '../utils/format';
import LineChart from './LineChart';
import SimBadge from './SimBadge';
import StatusPill from './StatusPill';
// Sensor details: health, last seen, device info (simulated) and historical readings.
export default function SensorDetail({ sensor: s, now, range, effNow }) {
  if (!s) return <div className="card empty"><div className="ico">📡</div><b>No sensor selected</b><div className="muted">Choose a sensor to see its health and history.</div></div>;
  const h = sensorHealth(s, now), ls = lastSeen(s, now), cutoff = now - ls * 1000;
  const hs = h.health >= 90 ? 'normal' : h.health >= 50 ? 'warning' : 'critical';
  const data = SENSOR_METRICS[s.type].map((m) => ({ m, d: series(s.zone, m, range, effNow).filter((p) => p.t <= cutoff) }));
  const rows = data[0].d.slice(-8).reverse(), off = data[0].d.length - rows.length;
  return (
    <div className="card">
      <div className="card-h"><h3>{s.id}</h3><div className="row-gap"><StatusPill status={hs} /><SimBadge /></div></div>
      <div className="muted">{s.label} · {s.zone.name} · status: <b>{s.status}</b></div>
      <div className="health"><span>Health {h.health}%</span><div className="bar"><i className={hs} style={{ width: `${h.health}%` }} /></div></div>
      <dl className="facts">
        <dt>Last seen</dt><dd>{ago(ls)} ({fmtDateTime(cutoff)})</dd><dt>Uptime (30d)</dt><dd>{h.uptime}%</dd>
        <dt>Signal</dt><dd>{h.signal}%</dd><dt>Battery</dt><dd>{h.battery === null ? 'Mains powered' : `${h.battery}%`}</dd>
        <dt>Firmware</dt><dd>{h.firmware}</dd><dt>Data source</dt><dd>Simulated</dd>
      </dl>
      {s.status !== 'active' && <div className="banner">No new readings since {fmtDateTime(cutoff)}. History below stops there.</div>}
      {data[0].d.length < 2 ? <div className="empty muted">No readings received in this time range.</div> : (
        <>
          <div className="charts one">{data.map(({ m, d }) => <div key={m}><div className="muted">{METRICS[m].label} {METRICS[m].unit.trim()}</div><LineChart series={[{ name: m, color: METRICS[m].color, data: d }]} range={range} height={150} /></div>)}</div>
          <h3 className="sub-h">Latest readings</h3>
          <div className="scroll"><table className="tbl"><thead><tr><th>Time</th>{data.map(({ m }) => <th key={m}>{METRICS[m].label}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={r.t}><td>{fmtTime(r.t, range)}</td>{data.map(({ m, d }) => { const v = d[d.length - 1 - i].v; return <td key={m} className={statusOf(s.zone, m, v)}>{v}{METRICS[m].unit}</td>; })}</tr>)}</tbody></table></div>
        </>)}
    </div>
  );
}
