import { METRICS, summary } from '../data/dataSource';
import StatCard from '../components/StatCard';
import ZonePanel from '../components/ZonePanel';
import AlertsPanel from '../components/AlertsPanel';
import ZoneCompare from '../components/ZoneCompare';
import Charts from '../components/Charts';
import SensorStatus from '../components/SensorStatus';
const CARDS = [['congestion', '🚦', 1], ['aqi', '🌫️', 0], ['temp', '🌡️', 1], ['energy', '⚡', 0]];
export default function Overview({ city, cityZones, zones, range, now, effNow, zone, onZone, alerts, onAck, sensors, onNav }) {
  const active = alerts.filter((a) => a.state !== 'resolved'), crit = active.filter((a) => a.severity === 'critical').length;
  const online = sensors.filter((s) => s.status === 'active').length;
  return (
    <>
      <div className="grid4">
        {CARDS.map(([m, ico, digits]) => {
          const M = METRICS[m], s = summary(zones, m, range, effNow), many = zones.length > 1;
          return <StatCard key={m} icon={ico} digits={digits} label={M.label + (many ? (m === 'energy' ? ' (total)' : ' (avg)') : '')}
            value={s.value} unit={M.unit} status={s.status} data={s.data} color={M.color} delta={s.delta} avg={s.avg} peak={s.peak} />;
        })}
        <StatCard icon="🔔" label="Active alerts" value={active.length} unit="" status={crit ? 'critical' : active.length ? 'warning' : 'normal'} sub={`${crit} critical`} />
        <StatCard icon="📡" label="Sensors reporting" value={`${online}/${sensors.length}`} unit="" status={online === sensors.length ? 'normal' : 'warning'} sub="simulated sensors" />
      </div>
      <div className="two">
        <ZonePanel zones={cityZones} now={now} selected={zone} onSelect={onZone} />
        <AlertsPanel alerts={alerts} onAck={onAck} now={now} limit={5} onViewAll={() => onNav('alerts')} />
      </div>
      <ZoneCompare key={city} zones={cityZones} range={range} now={effNow} />
      <Charts metrics={['congestion', 'aqi', 'temp', 'energy']} zones={zones} range={range} now={effNow} aggregate />
      <SensorStatus sensors={sensors} now={now} />
    </>
  );
}
