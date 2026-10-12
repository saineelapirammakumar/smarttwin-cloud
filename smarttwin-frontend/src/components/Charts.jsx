import { METRICS, series, summary, limits } from '../data/dataSource';
import LineChart from './LineChart';
import SimBadge from './SimBadge';
export const PALETTE = ['#38bdf8', '#a78bfa', '#fb923c', '#2dd4bf', '#facc15', '#f472b6'];
// One chart card per metric. aggregate = single city-average line instead of one line per zone.
export default function Charts({ metrics, zones, range, now, aggregate }) {
  return (
    <div className="charts">
      {metrics.map((m) => {
        const M = METRICS[m], single = zones.length === 1;
        const lines = single ? [{ name: zones[0].name, color: M.color, data: series(zones[0], m, range, now) }]
          : aggregate ? [{ name: 'City average', color: M.color, data: summary(zones, m, range, now).data }]
          : zones.map((z, i) => ({ name: z.name, color: PALETTE[i], data: series(z, m, range, now) }));
        return (
          <div className="card" key={m}>
            <div className="card-h"><h3>{M.label} <span className="muted">{M.unit.trim()}</span></h3><SimBadge /></div>
            <LineChart series={lines} range={range} limits={single ? limits(zones[0], m) : undefined} />
          </div>);
      })}
    </div>
  );
}
