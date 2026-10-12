import { CITIES, RANGES } from '../data/dataSource';
// Global filters: city (always), zone (city pages only), time range with optional custom dates.
export default function Filters({ city, onCity, zones, zone, onZone, showZone, range, onRange, custom, onCustom, error }) {
  const set = (k) => (e) => onCustom({ ...custom, [k]: e.target.value });
  return (
    <div className="filters">
      <select value={city} onChange={(e) => onCity(e.target.value)} aria-label="City">
        {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {showZone && (
        <select value={zone} onChange={(e) => onZone(e.target.value)} aria-label="City zone">
          <option value="all">All zones</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>)}
      <div className="seg">
        {Object.entries(RANGES).map(([k, r]) => <button key={k} className={range === k ? 'on' : ''} onClick={() => onRange(k)}>{r.label}</button>)}
        <button className={range === 'custom' ? 'on' : ''} onClick={() => onRange('custom')}>Custom</button>
      </div>
      {range === 'custom' && (
        <div className="custom">
          <input type="datetime-local" value={custom.start} onChange={set('start')} aria-label="Start date and time" />
          <span className="muted">to</span>
          <input type="datetime-local" value={custom.end} onChange={set('end')} aria-label="End date and time" />
          {error && <span className="err">{error}. Showing last 24H.</span>}
        </div>)}
    </div>
  );
}
