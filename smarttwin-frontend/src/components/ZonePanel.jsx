import { readingAt, statusOf, worstStatus } from '../data/dataSource';
import SimBadge from './SimBadge';
const SHOW = [['congestion', '🚦', '%'], ['aqi', '🌫️', ' AQI'], ['temp', '🌡️', '°C'], ['energy', '⚡', ' kW']];
export default function ZonePanel({ zones: ZONES, now, selected, onSelect }) {
  return (
    <div className="card">
      <div className="card-h"><h3>City zone monitor</h3><SimBadge /></div>
      <div className="zones">
        {ZONES.map((z) => {
          const all = ['congestion', 'aqi', 'temp', 'humidity', 'energy'].map((m) => statusOf(z, m, readingAt(z, m, now)));
          const worst = worstStatus(all);
          return (
            <button key={z.id} className={`zone ${worst} ${selected === z.id ? 'sel' : ''}`} onClick={() => onSelect(selected === z.id ? 'all' : z.id)}>
              <div className="zone-h"><b>{z.name}</b><i className={`dot ${worst}`} /></div>
              <div className="muted">{z.type}</div>
              <div className="zone-m">{SHOW.map(([m, ico, u]) => <span key={m}>{ico} {Math.round(readingAt(z, m, now))}{u}</span>)}</div>
            </button>);
        })}
      </div>
    </div>
  );
}
