import { useMemo, useState } from 'react';
import { METRICS } from '../data/dataSource';
import { ago, fmtDateTime } from '../utils/format';
import AlertDetail from '../components/AlertDetail';
import SimBadge from '../components/SimBadge';
const SEV = ['all', 'critical', 'warning'], STATE = ['all', 'open', 'acknowledged', 'resolved'];
export default function AlertsPage({ alerts, now, onAck, onResolve }) {
  const [sev, setSev] = useState('all'), [st, setSt] = useState('all'), [q, setQ] = useState(''), [sel, setSel] = useState(null);
  const list = useMemo(() => alerts.filter((a) => (sev === 'all' || a.severity === sev) && (st === 'all' || a.state === st)
    && (!q || `${a.zone.name} ${METRICS[a.metric].label} ${a.sensorId} ${a.severity} ${a.state}`.toLowerCase().includes(q.toLowerCase()))), [alerts, sev, st, q]);
  const count = (s) => alerts.filter((a) => a.state === s).length;
  const reset = () => { setSev('all'); setSt('all'); setQ(''); };
  return (
    <>
      <div className="card section">
        <div className="card-h"><h3>Alert filters</h3><SimBadge /></div>
        <div className="filters">
          <input className="search" type="search" placeholder="Search zone, metric or sensor" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search alerts" />
          <div className="seg">{SEV.map((s) => <button key={s} className={sev === s ? 'on' : ''} onClick={() => setSev(s)}>{s}</button>)}</div>
          <div className="seg">{STATE.map((s) => <button key={s} className={st === s ? 'on' : ''} onClick={() => setSt(s)}>{s}</button>)}</div>
        </div>
        <div className="muted" style={{ marginTop: 10 }}>{count('open')} open · {count('acknowledged')} acknowledged · {count('resolved')} resolved (last 6 hours)</div>
      </div>
      <div className="two">
        <div className="card">
          <div className="card-h"><h3>Alerts <span className="muted">showing {list.length} of {alerts.length}</span></h3></div>
          <div className="alerts tall">
            {list.length === 0 && <div className="empty"><b>No alerts match these filters</b><button className="btn" onClick={reset}>Clear filters</button></div>}
            {list.map((a) => (
              <button key={a.id} className={`arow ${a.severity} ${sel === a.id ? 'sel' : ''}`} onClick={() => setSel(a.id)}>
                <i className={`dot ${a.severity}`} />
                <div className="grow"><b>{a.zone.name}: {METRICS[a.metric].label}</b><div className="muted">{a.value}{METRICS[a.metric].unit} · limit {Math.round(a.limit)}{METRICS[a.metric].unit} · {a.sensorId}</div></div>
                <div className="right"><span className={`st ${a.state}`}>{a.state}</span><div className="muted">{fmtDateTime(a.t)} · {ago(Math.round((now - a.t) / 1000))}</div></div>
              </button>))}
          </div>
        </div>
        <AlertDetail alert={alerts.find((a) => a.id === sel)} now={now} onAck={onAck} onResolve={onResolve} />
      </div>
    </>
  );
}
