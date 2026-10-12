import { METRICS } from '../data/dataSource';
import { ago } from '../utils/format';
import SimBadge from './SimBadge';
// Compact alert feed (used on the Overview). Alerts arrive with a `state`: open | acknowledged | resolved.
export default function AlertsPanel({ alerts, onAck, now, limit = 5, onViewAll }) {
  const open = alerts.filter((a) => a.state === 'open').length;
  return (
    <div className="card">
      <div className="card-h"><h3>Live alerts <span className="badge">{open} open</span></h3><SimBadge /></div>
      <div className="alerts">
        {alerts.length === 0 && <div className="muted">No alerts in this view.</div>}
        {alerts.slice(0, limit).map((a) => {
          const M = METRICS[a.metric];
          return (
            <div key={a.id} className={`alert ${a.severity}`}>
              <i className={`dot ${a.severity}`} />
              <div className="grow"><b>{a.zone.name}: {M.label}</b>
                <div className="muted">{a.value}{M.unit} exceeded {Math.round(a.limit)}{M.unit} · {ago(Math.round((now - a.t) / 1000))}</div></div>
              <span className={`st ${a.state}`}>{a.state}</span>
              {a.state === 'open' && <button className="btn" onClick={() => onAck(a.id)}>Acknowledge</button>}
            </div>);
        })}
      </div>
      {onViewAll && <button className="btn ghost" style={{ marginTop: 12 }} onClick={onViewAll}>View all alerts</button>}
    </div>
  );
}
