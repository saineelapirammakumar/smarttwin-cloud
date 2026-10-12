import { METRICS, cityNow, sensorsOf, zonesOf } from '../data/dataSource';
import SimBadge from './SimBadge';
import StatusPill from './StatusPill';
const ROWS = [['congestion', '🚦'], ['aqi', '🌫️'], ['temp', '🌡️'], ['humidity', '💧'], ['energy', '⚡']];
// Summary card for one city: indicators, sensor count and alert count.
export default function CityCard({ city, now, alerts, selected, onSelect, onOpen }) {
  const n = cityNow(city.id, now), sn = sensorsOf(city.id), M = n.metrics;
  const act = alerts.filter((a) => a.zone.city === city.id && a.state !== 'resolved'), crit = act.filter((a) => a.severity === 'critical').length;
  const Head = onSelect ? 'button' : 'div';
  return (
    <div className={`card ccard ${n.status} ${selected ? 'sel' : ''}`}>
      <Head className="ccard-h" onClick={onSelect}><b>{city.name}</b><StatusPill status={n.status} /></Head>
      <div className="muted">{city.region} · {zonesOf(city.id).length} zones</div>
      {ROWS.map(([m, ico]) => (
        <div key={m}><div className="ci"><span>{ico} {METRICS[m].label}</span><b>{M[m].value}{METRICS[m].unit}</b></div>
          {m === 'congestion' && <div className="bar"><i className={M[m].status} style={{ width: `${M[m].value}%` }} /></div>}</div>))}
      <div className="ci muted"><span>📡 Sensors online</span><span>{sn.filter((s) => s.status === 'active').length}/{sn.length}</span></div>
      <div className="ci muted"><span>🔔 Active alerts</span><span>{act.length} ({crit} critical)</span></div>
      <div className="row-gap">{onOpen && <button className="btn ghost" onClick={onOpen}>Open dashboard</button>}<SimBadge /></div>
    </div>
  );
}
