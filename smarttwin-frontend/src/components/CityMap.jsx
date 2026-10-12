import { useState } from 'react';
import { CITIES, CITY_BY_ID, METRICS, SENSORS, zonesOf, readingAt, statusOf, worstStatus, cityNow } from '../data/dataSource';
import { TN_PATH, project, SLOTS, ROADS, centroid, LABEL_LEFT } from '../data/cityLayout';
import SimBadge from './SimBadge';
const LAYERS = [['status', 'Overall'], ['congestion', 'Traffic'], ['aqi', 'AQI'], ['temp', 'Temp'], ['energy', 'Energy']];
const SENS = { active: '#22c55e', faulty: '#f59e0b', offline: '#ef4444' };
const act = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
// Two views: "Tamil Nadu" (select a city on the state map) and "City zones" (select a zone in that city).
export default function CityMap({ now, city, onCity, zone, onZone, layer, onLayer, initialView = 'city', openOnSelect }) {
  const [view, setView] = useState(initialView), c0 = CITY_BY_ID[city], zs = zonesOf(city);
  const pickCity = (id) => { onCity(id); if (openOnSelect) setView('city'); };
  return (
    <div className="card">
      <div className="card-h"><h3>{view === 'state' ? 'Tamil Nadu map' : `${c0.short || c0.name} zone map`}</h3><SimBadge /></div>
      <div className="row-gap" style={{ marginBottom: 10 }}>
        <div className="seg"><button className={view === 'state' ? 'on' : ''} onClick={() => setView('state')}>Tamil Nadu</button><button className={view === 'city' ? 'on' : ''} onClick={() => setView('city')}>{c0.short || c0.name} zones</button></div>
        <div className="seg">{LAYERS.map(([k, l]) => <button key={k} className={layer === k ? 'on' : ''} onClick={() => onLayer(k)}>{l}</button>)}</div>
      </div>
      {view === 'state' ? (
        <svg viewBox="0 0 420 540" className="map tnmap" role="group" aria-label="Map of Tamil Nadu with selectable cities">
          <path d={TN_PATH} className="tn" />
          {CITIES.map((c) => {
            const [x, y] = project(c.lat, c.lng), cn = cityNow(c.id, now), left = LABEL_LEFT.includes(c.id), sel = c.id === city;
            const st = layer === 'status' ? cn.status : cn.metrics[layer].status;
            const label = `${c.short || c.name}${layer === 'status' ? '' : ` ${Math.round(cn.metrics[layer].value)}${METRICS[layer].unit}`}`;
            return (
              <g key={c.id} className="mz" tabIndex="0" role="button" aria-label={`${c.name}, ${st}`} aria-pressed={sel} onClick={() => pickCity(c.id)} onKeyDown={act(() => pickCity(c.id))}>
                <circle cx={x} cy={y} r={sel ? 11 : 8} className={`cdot ${st} ${sel ? 'sel' : ''}`} />
                <text x={x + (left ? -14 : 14)} y={y + 4} textAnchor={left ? 'end' : 'start'} className="clabel">{label}</text>
              </g>);
          })}
        </svg>
      ) : (
        <svg viewBox="0 0 600 330" className="map" role="group" aria-label={`${c0.name} zone map`}>
          {ROADS.map((r, i) => <line key={i} x1={r[0]} y1={r[1]} x2={r[2]} y2={r[3]} className="road" />)}
          {zs.map((z) => {
            const pts = SLOTS[z.slot], [cx, cy] = centroid(pts), v = layer === 'status' ? null : readingAt(z, layer, now);
            const st = v === null ? worstStatus(Object.keys(METRICS).map((m) => statusOf(z, m, readingAt(z, m, now)))) : statusOf(z, layer, v);
            const pick = () => onZone(zone === z.id ? 'all' : z.id);
            return (
              <g key={z.id} className="mz" tabIndex="0" role="button" aria-label={`${z.name}, ${st}`} aria-pressed={zone === z.id} onClick={pick} onKeyDown={act(pick)}>
                <polygon points={pts} className={`mshape ${st} ${zone === z.id ? 'sel' : ''}`} />
                <text x={cx} y={cy - 12} className="mname">{z.name.length > 22 ? z.name.slice(0, 21) + '…' : z.name}</text>
                <text x={cx} y={cy + 12} className="mval">{v === null ? st : `${Math.round(v)}${METRICS[layer].unit}`}</text>
                {SENSORS.filter((s) => s.zone.id === z.id).map((s, i) => <circle key={s.id} cx={cx + (i - 1) * 18} cy={cy + 34} r="5" fill={SENS[s.status]}><title>{`${s.id}: ${s.status}`}</title></circle>)}
              </g>);
          })}
        </svg>)}
      <div className="legend"><span><i style={{ background: '#3b82f6' }} />Normal</span><span><i style={{ background: '#f59e0b' }} />Warning</span><span><i style={{ background: '#ef4444' }} />Critical</span>
        <span className="muted">{view === 'state' ? 'Simplified outline, approximate city positions. Click a city.' : 'Schematic layout, not to scale. Dots = sensors. Click a zone.'}</span></div>
    </div>
  );
}
