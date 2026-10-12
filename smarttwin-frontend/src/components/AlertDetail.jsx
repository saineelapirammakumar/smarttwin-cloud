import { useEffect, useState } from 'react';
import { METRICS, fetchSeries, limits } from '../data/dataSource';
import { ago, fmtDateTime } from '../utils/format';
import LineChart from './LineChart';
import SimBadge from './SimBadge';
// Incident details: summary, timeline, chart around the incident, and acknowledge / resolve actions.
const SPEC = { ms: 108e5, step: 3e5 }; // chart window around the incident: 3 hours
export default function AlertDetail({ alert: a, now, onAck, onResolve }) {
  const [data, setData] = useState(null); // null = loading
  useEffect(() => {
    if (!a) return undefined;
    let on = true;
    setData(null);
    fetchSeries(a.zone, a.metric, SPEC, Math.min(Date.now(), a.t + 54e5)).then((d) => on && setData(d)).catch(() => on && setData([]));
    return () => { on = false; };
  }, [a?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <div className="card empty"><div className="ico">🔔</div><b>No incident selected</b><div className="muted">Choose an alert from the list to see its details.</div></div>;
  const M = METRICS[a.metric], u = M.unit, spec = SPEC;
  const events = [
    [a.t, 'Triggered', `${a.value}${u} crossed the ${a.severity} limit of ${Math.round(a.limit)}${u}`],
    a.ackAt && [a.ackAt, 'Acknowledged', 'by Demo operator (login arrives in a later phase)'],
    a.resolvedAt && [a.resolvedAt, 'Resolved', 'manually by Demo operator'],
    a.resolved && !a.resolvedAt && [null, 'Cleared automatically', 'reading returned within limits'],
  ].filter(Boolean);
  return (
    <div className="card">
      <div className="card-h"><h3>Incident details</h3><SimBadge /></div>
      <div className={`alert ${a.severity}`}><i className={`dot ${a.severity}`} /><div className="grow"><b>{a.zone.name}: {M.label}</b>
        <div className="muted">{a.severity} · {a.state} · sensor {a.sensorId}</div></div><span className={`st ${a.state}`}>{a.state}</span></div>
      <dl className="facts">
        <dt>Reading</dt><dd>{a.value}{u}</dd><dt>Limit</dt><dd>{Math.round(a.limit)}{u}</dd>
        <dt>Triggered</dt><dd>{fmtDateTime(a.t)} ({ago(Math.round((now - a.t) / 1000))})</dd><dt>Zone</dt><dd>{a.zone.name} ({a.zone.type})</dd>
      </dl>
      {data === null ? <div className="muted">Loading chart…</div> : data.length < 2 ? <div className="muted">No readings found around this incident.</div>
        : <LineChart series={[{ name: M.label, color: M.color, data }]} range={spec} limits={limits(a.zone, a.metric)} height={190} />}
      <h3 className="sub-h">Timeline</h3>
      <ol className="tl">{events.map(([t, title, text]) => <li key={title}><b>{title}</b> <span className="muted">{t ? fmtDateTime(t) : ''}</span><div className="muted">{text}</div></li>)}</ol>
      <div className="row-gap">
        {a.state === 'open' && <button className="btn" onClick={() => onAck(a.id)}>Acknowledge</button>}
        {a.state !== 'resolved' && <button className="btn ghost" onClick={() => onResolve(a.id)}>Mark as resolved</button>}
        {a.state === 'resolved' && <span className="muted">This incident is closed.</span>}
      </div>
    </div>
  );
}
