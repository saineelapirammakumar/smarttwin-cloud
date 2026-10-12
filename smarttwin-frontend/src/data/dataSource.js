// Data layer backed by the FastAPI backend (PostgreSQL). It exports the same names the components already
// used, so the UI did not need to change. All readings are SIMULATED sample data produced by the backend simulator.
import { api } from './api';

export const DATA_SOURCE = 'simulated';
// Colours and units are display settings. warn/crit are overwritten with the backend's thresholds on load.
export const METRICS = {
  congestion: { label: 'Traffic Congestion', unit: '%', warn: 70, crit: 90, color: '#38bdf8' },
  aqi: { label: 'Air Quality (AQI)', unit: '', warn: 100, crit: 200, color: '#a78bfa' },
  temp: { label: 'Temperature', unit: '°C', warn: 38, crit: 42, color: '#fb923c' },
  humidity: { label: 'Humidity', unit: '%', warn: 85, crit: 95, color: '#2dd4bf' },
  energy: { label: 'Energy Consumption', unit: ' kW', warn: 1.25, crit: 1.5, rel: true, color: '#facc15' },
};
export const RANGES = {
  '1h': { label: '1H', ms: 36e5, step: 6e4 }, '6h': { label: '6H', ms: 216e5, step: 3e5 },
  '24h': { label: '24H', ms: 864e5, step: 9e5 }, '7d': { label: '7D', ms: 6048e5, step: 72e5 },
};
const RANK = { normal: 0, warning: 1, critical: 2 };
export const worstStatus = (arr) => arr.slice().sort((a, b) => RANK[b] - RANK[a])[0];
export const SENSOR_METRICS = { traffic: ['congestion'], aqi: ['aqi'], temperature: ['temp'], humidity: ['humidity'], energy: ['energy'] };
const TO_API = { congestion: 'traffic', aqi: 'aqi', temp: 'temperature', humidity: 'humidity', energy: 'energy' };
const FROM_API = Object.fromEntries(Object.entries(TO_API).map(([k, v]) => [v, k]));
const iso = (ms) => new Date(ms).toISOString();
const hashStr = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 997; };
const hash = (a, b, c) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };

// ---- catalog and latest values (live bindings, filled by loadCatalog / refreshLive) ----
export let CITIES = [], CITY_BY_ID = {}, ZONES = [], SENSORS = [];
let ZONE_BY_ID = {}, ZBC = {}, SBC = {}, LATEST = {}, HIST = {};
export const zonesOf = (id) => ZBC[id] || [];
export const sensorsOf = (id) => SBC[id] || [];
export const hasData = () => Object.keys(LATEST).length > 0;

const mapSensor = (s) => ({ id: s.id, zone: ZONE_BY_ID[s.zone_id], type: s.sensor_type, label: s.name, status: s.status, seed: hashStr(s.id), lastReadingAt: s.last_reading_at ? Date.parse(s.last_reading_at) : null });
function setSensors(rows) {
  SENSORS = rows.map(mapSensor).filter((s) => s.zone);
  SBC = {};
  SENSORS.forEach((s) => (SBC[s.zone.city] = SBC[s.zone.city] || []).push(s));
}
function setLatest(rows) {
  LATEST = {};
  rows.forEach((r) => { (LATEST[r.zone_id] = LATEST[r.zone_id] || {})[FROM_API[r.metric]] = { v: r.value, t: Date.parse(r.recorded_at) }; });
}
export async function loadCatalog() {
  const [cities, zones, sensors, th, latest] = await Promise.all([api('/api/cities'), api('/api/zones'), api('/api/sensors?limit=1000'), api('/api/thresholds'), api('/api/readings/latest')]);
  CITIES = cities.map((c) => ({ id: c.id, name: c.name, short: c.short_name || undefined, region: c.region, lat: c.latitude, lng: c.longitude }));
  CITY_BY_ID = Object.fromEntries(CITIES.map((c) => [c.id, c]));
  ZONES = zones.map((z) => ({ id: z.id, city: z.city_id, slot: z.sort_order, name: z.name, type: z.category, energy: z.meta?.energy_baseline_kw ?? 400 }));
  ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));
  ZBC = {};
  ZONES.forEach((z) => (ZBC[z.city] = ZBC[z.city] || []).push(z));
  Object.entries(TO_API).forEach(([m, t]) => { if (th[t]) { METRICS[m].warn = th[t].warning; METRICS[m].crit = th[t].critical; } });
  setSensors(sensors);
  setLatest(latest);
  HIST = {};
}
export async function refreshLive() { // latest values + sensor status/last-seen
  const [sensors, latest] = await Promise.all([api('/api/sensors?limit=1000'), api('/api/readings/latest')]);
  setSensors(sensors);
  setLatest(latest);
}

// ---- thresholds and status ----
export const limits = (zone, metric) => { const m = METRICS[metric], k = m.rel ? zone.energy : 1; return { warn: m.warn * k, crit: m.crit * k }; };
export const statusOf = (zone, metric, v) => { const l = limits(zone, metric); return v >= l.crit ? 'critical' : v >= l.warn ? 'warning' : 'normal'; };
export const readingAt = (zone, metric) => LATEST[zone.id]?.[metric]?.v ?? 0; // latest value from the backend

// ---- time series (loaded per city and range, then sampled onto the chart grid) ----
export const resolveRange = (r) => (typeof r === 'string' ? RANGES[r] : r);
export const customRange = (startMs, endMs) => { const ms = endMs - startMs; return { ms, step: ms <= 36e5 ? 6e4 : ms <= 216e5 ? 3e5 : ms <= 864e5 ? 9e5 : 72e5, custom: true }; };
const keyOf = (city, spec, end) => `${city}|${spec.ms}|${spec.step}|${spec.custom ? end : 'live'}`;
export async function loadSeries(cityIds, range, endMs) {
  const spec = resolveRange(range), start = endMs - 2 * spec.ms; // 2x window so the previous period is available
  await Promise.all(cityIds.map(async (c) => {
    const d = await api(`/api/readings/timeseries?city_id=${c}&start=${iso(start)}&end=${iso(endMs)}&bucket_seconds=${Math.round(spec.step / 1000)}`);
    const zones = {};
    d.series.forEach((s) => { (zones[s.zone_id] = zones[s.zone_id] || {})[FROM_API[s.metric]] = s.points.map(([t, v]) => ({ t, v })); });
    HIST[keyOf(c, spec, endMs)] = zones;
  }));
}
const GAP_TOLERANCE = 36e5; // older sample history is 30 minutes apart, so allow up to 1 hour before calling it a gap
function sample(points, spec, end, fallback) { // hold the latest value at or before each grid time
  const out = []; let j = 0;
  for (let i = 0; i <= spec.ms / spec.step; i++) {
    const t = end - spec.ms + i * spec.step;
    while (j + 1 < points.length && points[j + 1].t <= t) j++;
    const p = points[j];
    out.push({ t, v: p ? p.v : fallback, gap: !p || (j === 0 && t < p.t - Math.max(spec.step, GAP_TOLERANCE)) });
  }
  return out;
}
export function series(zone, metric, range, now, cacheEnd = now) {
  const spec = resolveRange(range), pts = HIST[keyOf(zone.city, spec, cacheEnd)]?.[zone.id]?.[metric] || [];
  return sample(pts, spec, now, LATEST[zone.id]?.[metric]?.v ?? 0);
}
export async function fetchSeries(zone, metric, spec, end) { // one-off window (used by the incident chart)
  const d = await api(`/api/readings/timeseries?zone_id=${zone.id}&metric=${TO_API[metric]}&start=${iso(end - spec.ms)}&end=${iso(end)}&bucket_seconds=${Math.round(spec.step / 1000)}`);
  const pts = (d.series[0]?.points || []).map(([t, v]) => ({ t, v }));
  return pts.length ? sample(pts, spec, end, 0) : [];
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
function aggSeries(zones, metric, range, now, cacheEnd) {
  const ss = zones.map((z) => series(z, metric, range, now, cacheEnd));
  return ss[0].map((p, i) => { const vs = ss.map((s) => s[i].v); return { t: p.t, gap: ss.some((s) => s[i].gap), v: metric === 'energy' ? vs.reduce((x, y) => x + y, 0) : mean(vs) }; });
}
// Average (energy = total) over a set of zones + comparison with the previous period (delta is null if no data exists for it).
export function summary(zones, metric, range, now) {
  const spec = resolveRange(range), data = aggSeries(zones, metric, range, now, now), prev = aggSeries(zones, metric, range, now - spec.ms, now);
  const vals = data.map((p) => p.v), avg = mean(vals), prevAvg = mean(prev.map((p) => p.v)), last = vals[vals.length - 1], first = vals[0];
  const status = worstStatus(zones.map((z) => statusOf(z, metric, readingAt(z, metric))));
  return { data, status, avg, peak: Math.max(...vals), low: Math.min(...vals), delta: !prev[0].gap && prevAvg ? ((avg - prevAvg) / prevAvg) * 100 : null,
    value: +last.toFixed(metric === 'aqi' || metric === 'energy' ? 0 : 1), change: first ? ((last - first) / first) * 100 : 0 };
}
export function cityNow(cityId, now) {
  const zs = zonesOf(cityId), metrics = {};
  Object.keys(METRICS).forEach((m) => {
    const vs = zs.map((z) => readingAt(z, m, now)), v = m === 'energy' ? vs.reduce((a, b) => a + b, 0) : mean(vs);
    metrics[m] = { value: m === 'aqi' || m === 'energy' ? Math.round(v) : +v.toFixed(1), status: worstStatus(zs.map((z, i) => statusOf(z, m, vs[i]))) };
  });
  return { metrics, status: worstStatus(Object.values(metrics).map((x) => x.status)) };
}

// ---- sensors ----
export const lastSeen = (s, now) => (s.lastReadingAt ? Math.max(0, Math.round((now - s.lastReadingAt) / 1000)) : 99999);
export const sensorIdFor = (zoneId, metric) => SENSORS.find((s) => s.zone.id === zoneId && SENSOR_METRICS[s.type].includes(metric))?.id;
// Device details below are illustrative demo values (the backend does not track battery or firmware).
export function sensorHealth(s) {
  const j = (k, r) => Math.floor(hash(s.seed, k, 7) * r);
  return { health: s.status === 'active' ? 96 + j(2, 4) : s.status === 'faulty' ? 58 : 0, battery: s.type === 'energy' ? null : 40 + j(3, 55) - (s.status === 'faulty' ? 25 : 0),
    signal: s.status === 'offline' ? 0 : 55 + j(4, 45), uptime: s.status === 'active' ? 99 + j(5, 10) / 10 : s.status === 'faulty' ? 91.4 : 62.8, firmware: `v1.${2 + j(6, 4)}.${j(7, 9)}` };
}

// ---- alerts (stored in PostgreSQL; acknowledge/resolve are saved) ----
export function toAlert(a) {
  const auto = a.status === 'resolved' && (a.resolution_note || '').startsWith('Auto-resolved');
  return { id: a.id, zone: ZONE_BY_ID[a.zone_id], metric: FROM_API[a.metric], severity: a.severity, value: a.value, t: Date.parse(a.triggered_at), limit: a.threshold, sensorId: a.sensor_id,
    state: a.status, resolved: a.status === 'resolved', ackAt: a.acknowledged_at ? Date.parse(a.acknowledged_at) : undefined, resolvedAt: a.status === 'resolved' && !auto ? Date.parse(a.resolved_at) : undefined };
}
export async function loadAlerts() { return (await api('/api/alerts?limit=500')).map(toAlert).filter((a) => a.zone && a.metric); }
export const updateAlert = (id, status, note) => api(`/api/alerts/${id}`, { method: 'PATCH', body: { status, note } });
