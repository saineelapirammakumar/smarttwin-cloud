import LineChart from './LineChart';
import SimBadge from './SimBadge';
import StatusPill from './StatusPill';
// KPI card. delta = % change vs the previous period (for these metrics, higher = worse).
export default function StatCard({ icon, label, value, unit, status, data, color, delta, avg, peak, sub, digits = 0 }) {
  const up = delta > 0.05, down = delta < -0.05;
  return (
    <div className={`card stat ${status}`}>
      <div className="card-h"><span className="ico">{icon}</span><SimBadge /></div>
      <div className="muted">{label}</div>
      <div className="stat-val">{value}<small>{unit}</small></div>
      <div className="stat-sub"><StatusPill status={status} />
        {delta != null && <span className={`trend ${up ? 'bad' : down ? 'good' : ''}`}>{up ? '▲' : down ? '▼' : '■'} {Math.abs(delta).toFixed(1)}% vs previous period</span>}
        {sub && <span className="muted">{sub}</span>}</div>
      {avg !== undefined && <div className="stat-ext muted">Avg {avg.toFixed(digits)} · Peak {peak.toFixed(digits)}{unit}</div>}
      {data && <LineChart compact height={46} series={[{ name: label, color, data }]} />}
    </div>
  );
}
