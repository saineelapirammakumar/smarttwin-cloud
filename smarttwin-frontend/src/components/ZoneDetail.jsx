import { METRICS, SENSORS, readingAt, statusOf, limits, series, sensorIdFor, lastSeen, worstStatus } from '../data/dataSource';
import { ago } from '../utils/format';
import LineChart from './LineChart';
import SimBadge from './SimBadge';
import StatusPill from './StatusPill';
const DOT = { active: 'normal', faulty: 'warning', offline: 'critical' };
// Inspect one zone: current readings vs thresholds, trend per metric, and its sensors.
export default function ZoneDetail({ zone, now, range, effNow }) {
  if (!zone) return <div className="card empty"><div className="ico">🗺️</div><b>No zone selected</b><div className="muted">Click a zone on the map to inspect its sensors and readings.</div></div>;
  const keys = Object.keys(METRICS), overall = worstStatus(keys.map((m) => statusOf(zone, m, readingAt(zone, m, now))));
  return (
    <div className="card">
      <div className="card-h"><h3>{zone.name} <span className="muted">{zone.type}</span></h3><div className="row-gap"><StatusPill status={overall} /><SimBadge /></div></div>
      <div className="tiles">
        {keys.map((m) => {
          const M = METRICS[m], v = readingAt(zone, m, now), st = statusOf(zone, m, v), l = limits(zone, m);
          return (
            <div key={m} className={`tile ${st}`}>
              <div className="muted">{M.label}</div>
              <div className="tile-v">{v}<small>{M.unit}</small></div>
              <StatusPill status={st} />
              <div className="muted">warn {Math.round(l.warn)} · crit {Math.round(l.crit)}{M.unit}</div>
              <div className="muted">Sensor {sensorIdFor(zone.id, m)}</div>
              <LineChart compact height={34} series={[{ name: M.label, color: M.color, data: series(zone, m, range, effNow) }]} />
            </div>);
        })}
      </div>
      <h3 className="sub-h">Sensors in this zone</h3>
      <div className="sens one">
        {SENSORS.filter((s) => s.zone.id === zone.id).map((s) => <div key={s.id} className="sens-row"><i className={`dot ${DOT[s.status]}`} /><div className="grow"><b>{s.id}</b><div className="muted">{s.label} · {s.status}</div></div><span className="muted">{ago(lastSeen(s, now))}</span></div>)}
      </div>
    </div>
  );
}
