import { useState } from 'react';
import { CITIES, CITY_BY_ID, ZONES, SENSORS, METRICS, summary, cityNow, zonesOf, readingAt, statusOf, worstStatus } from '../data/dataSource';
import StatCard from '../components/StatCard';
import CityMap from '../components/CityMap';
import CityCard from '../components/CityCard';
import LineChart from '../components/LineChart';
import SimBadge from '../components/SimBadge';
import StatusPill from '../components/StatusPill';
const CARDS = [['congestion', '🚦', 1], ['aqi', '🌫️', 0], ['temp', '🌡️', 1], ['energy', '⚡', 0]];
// State-level overview: Tamil Nadu KPIs, map with selectable cities, city cards and energy analytics.
export default function StatePage({ city, onCity, onNav, alerts, now, range, effNow }) {
  const [layer, setLayer] = useState('status');
  const active = alerts.filter((a) => a.state !== 'resolved'), crit = active.filter((a) => a.severity === 'critical').length;
  const online = SENSORS.filter((s) => s.status === 'active').length;
  const S = Object.fromEntries(CARDS.map(([m]) => [m, summary(ZONES, m, range, effNow)]));
  const energy = CITIES.map((c) => ({ c, v: cityNow(c.id, now).metrics.energy })).sort((a, b) => b.v.value - a.v.value);
  const total = energy.reduce((a, r) => a + r.v.value, 0), top = energy[0].v.value || 1, c0 = CITY_BY_ID[city];
  const open = (id) => { onCity(id); onNav('overview'); };
  return (
    <>
      <div className="grid4">
        {CARDS.map(([m, ico, digits]) => <StatCard key={m} icon={ico} digits={digits} label={`${METRICS[m].label} (state ${m === 'energy' ? 'total' : 'avg'})`} value={S[m].value} unit={METRICS[m].unit}
          status={S[m].status} data={S[m].data} color={METRICS[m].color} delta={S[m].delta} avg={S[m].avg} peak={S[m].peak} />)}
        <StatCard icon="🔔" label="Active alerts (all cities)" value={active.length} unit="" status={crit ? 'critical' : active.length ? 'warning' : 'normal'} sub={`${crit} critical`} />
        <StatCard icon="📡" label="Sensors reporting" value={`${online}/${SENSORS.length}`} unit="" status={online === SENSORS.length ? 'normal' : 'warning'} sub={`${CITIES.length} cities, ${ZONES.length} zones`} />
      </div>
      <div className="two">
        <CityMap now={now} city={city} onCity={onCity} zone="all" onZone={() => {}} layer={layer} onLayer={setLayer} initialView="state" />
        <div className="card">
          <div className="card-h"><h3>{c0.name} <span className="muted">{c0.region}</span></h3><SimBadge /></div>
          <div className="sens one">
            {zonesOf(city).map((z) => { const st = worstStatus(Object.keys(METRICS).map((m) => statusOf(z, m, readingAt(z, m, now))));
              return <div key={z.id} className="sens-row"><i className={`dot ${st}`} /><div className="grow"><b>{z.name}</b><div className="muted">{z.type}</div></div>
                <span className="muted">{readingAt(z, 'congestion', now)}% · AQI {Math.round(readingAt(z, 'aqi', now))}</span></div>; })}
          </div>
          <div className="row-gap" style={{ marginTop: 12 }}><button className="btn" onClick={() => onNav('overview')}>Open city dashboard</button><button className="btn ghost" onClick={() => onNav('zones')}>Inspect zones</button><button className="btn ghost" onClick={() => onNav('compare')}>Compare cities</button></div>
        </div>
      </div>
      <h3 className="sub-h">Cities</h3>
      <div className="cities">{CITIES.map((c) => <CityCard key={c.id} city={c} now={now} alerts={alerts} selected={c.id === city} onSelect={() => onCity(c.id)} onOpen={() => open(c.id)} />)}</div>
      <div className="charts">
        <div className="card"><div className="card-h"><h3>Energy by city <span className="muted">kW now</span></h3><SimBadge /></div>
          <div className="rank">{energy.map(({ c, v }) => (
            <div key={c.id} className="rank-row"><span className="rk-n">{c.short || c.name}</span><div className="bar"><i className={v.status} style={{ width: `${(v.value / top) * 100}%` }} /></div>
              <b>{v.value}</b><span className="muted rk-m">{((v.value / total) * 100).toFixed(1)}% of state total</span><StatusPill status={v.status} /></div>))}</div></div>
        <div className="card"><div className="card-h"><h3>State energy trend <span className="muted">total kW</span></h3><SimBadge /></div>
          <LineChart series={[{ name: 'Tamil Nadu total', color: METRICS.energy.color, data: S.energy.data }]} range={range} /></div>
        <div className="card"><div className="card-h"><h3>State traffic trend <span className="muted">avg congestion %</span></h3><SimBadge /></div>
          <LineChart series={[{ name: 'Tamil Nadu average', color: METRICS.congestion.color, data: S.congestion.data }]} range={range} /></div>
      </div>
    </>
  );
}
