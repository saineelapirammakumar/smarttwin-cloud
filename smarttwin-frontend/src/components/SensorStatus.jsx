import { useState } from 'react';
import { lastSeen } from '../data/dataSource';
import { ago } from '../utils/format';
import SimBadge from './SimBadge';
const COLOR = { active: 'normal', faulty: 'warning', offline: 'critical' };
// Sensor list. With onSelect it becomes clickable; with filterable the counts act as status filters.
export default function SensorStatus({ sensors, now, onSelect, selectedId, filterable }) {
  const [f, setF] = useState('all');
  const c = (s) => sensors.filter((x) => x.status === s).length;
  const list = f === 'all' ? sensors : sensors.filter((s) => s.status === f);
  const Row = onSelect ? 'button' : 'div';
  const chips = [['all', `${sensors.length} total`, ''], ['active', `${c('active')} active`, 'normal'], ['faulty', `${c('faulty')} faulty`, 'warning'], ['offline', `${c('offline')} offline`, 'critical']];
  return (
    <div className="card">
      <div className="card-h"><h3>Sensor status</h3><SimBadge /></div>
      <div className="chips">
        {chips.filter(([k]) => filterable || k !== 'all').map(([k, label, dot]) => (filterable
          ? <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{dot && <i className={`dot ${dot}`} />}{label}</button>
          : <span key={k} className="plain"><i className={`dot ${dot}`} />{label}</span>))}
      </div>
      <div className="sens">
        {list.length === 0 && <div className="muted">No sensors match this filter.</div>}
        {list.map((s) => (
          <Row key={s.id} className={`sens-row ${selectedId === s.id ? 'sel' : ''}`} onClick={onSelect ? () => onSelect(s.id) : undefined}>
            <i className={`dot ${COLOR[s.status]}`} />
            <div className="grow"><b>{s.id}</b><div className="muted">{s.label} · {s.zone.name}</div></div>
            <span className="muted">{ago(lastSeen(s, now))}</span></Row>))}
      </div>
    </div>
  );
}
