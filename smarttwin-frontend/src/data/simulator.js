// SIMULATED DATA ONLY. Illustrative zones and values, NOT official or live measurements.
// Deterministic: the same (zone, metric, timestamp) always gives the same reading, so sample data is repeatable.
export const DATA_SOURCE = 'simulated';
const hash = (a, b, c) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };
const bump = (h, c, w = 4) => Math.exp(-((h - c) ** 2) / w);

// Illustrative base traffic intensity (t) and energy baseline in kW (e) per zone type.
const TYPES = {
  Commercial: { t: 1.0, e: 520 }, Industrial: { t: 0.8, e: 900 }, Residential: { t: 0.6, e: 380 }, Campus: { t: 0.5, e: 300 },
  Highway: { t: 1.1, e: 150 }, Transit: { t: 1.1, e: 320 }, Tech: { t: 0.8, e: 620 }, Port: { t: 0.75, e: 800 },
  Heritage: { t: 0.7, e: 260 }, Market: { t: 1.05, e: 430 },
};
// Per-city scaling (traffic, energy, temp offset °C, humidity offset, AQI offset) and 6 illustrative zones.
// Zone order = map slots: NW, N, NE, SW, S, SE.
const CITY_DEFS = [
  { id: 'chennai', name: 'Chennai', region: 'Northern coast', lat: 13.08, lng: 80.27, traffic: 1.15, energy: 2.2, temp: 1.5, hum: 4, aqi: 10,
    zones: [['perambur', 'Perambur', 'Residential'], ['central', 'Chennai Central', 'Transit'], ['royapuram', 'Royapuram Harbour', 'Port'], ['guindy', 'Guindy Industrial Estate', 'Industrial'], ['t-nagar', 'T. Nagar', 'Commercial'], ['omr', 'OMR IT Corridor', 'Tech']] },
  { id: 'coimbatore', name: 'Coimbatore', region: 'Western Tamil Nadu', lat: 11.0, lng: 76.96, traffic: 1.0, energy: 1.4, temp: -2.5, hum: -4, aqi: 3,
    zones: [['saravanampatti', 'Saravanampatti', 'Tech'], ['gandhipuram', 'Gandhipuram', 'Commercial'], ['peelamedu', 'Peelamedu', 'Campus'], ['podanur', 'Podanur Industrial Belt', 'Industrial'], ['race-course', 'Race Course', 'Heritage'], ['singanallur', 'Singanallur', 'Residential']] },
  { id: 'madurai', name: 'Madurai', region: 'South-central', lat: 9.93, lng: 78.12, traffic: 1.0, energy: 1.2, temp: 2, hum: 0, aqi: 2,
    zones: [['anna-nagar', 'Anna Nagar', 'Residential'], ['periyar', 'Periyar Bus Stand Area', 'Transit'], ['meenakshi', 'Meenakshi Temple Area', 'Heritage'], ['kappalur', 'Kappalur Industrial Estate', 'Industrial'], ['goripalayam', 'Goripalayam Market', 'Market'], ['airport-road', 'Airport Road', 'Highway']] },
  { id: 'trichy', name: 'Tiruchirappalli (Trichy)', short: 'Trichy', region: 'Central', lat: 10.79, lng: 78.7, traffic: 0.9, energy: 1.0, temp: 1.5, hum: 0, aqi: 2,
    zones: [['thillai-nagar', 'Thillai Nagar', 'Commercial'], ['srirangam', 'Srirangam Temple Area', 'Heritage'], ['bhel', 'BHEL Township', 'Industrial'], ['woraiyur', 'Woraiyur', 'Residential'], ['chatram', 'Chatram Bus Stand', 'Transit'], ['chennai-bypass', 'Chennai Bypass Road', 'Highway']] },
  { id: 'salem', name: 'Salem', region: 'North-western', lat: 11.66, lng: 78.15, traffic: 0.85, energy: 1.0, temp: 0.5, hum: -2, aqi: 4,
    zones: [['fairlands', 'Fairlands', 'Residential'], ['junction', 'Salem Junction', 'Transit'], ['steel-plant', 'Steel Plant Area', 'Industrial'], ['five-roads', 'Five Roads Junction', 'Commercial'], ['hasthampatti', 'Hasthampatti Market', 'Market'], ['omalur-road', 'Omalur Road', 'Highway']] },
  { id: 'tirunelveli', name: 'Tirunelveli', region: 'Far south', lat: 8.73, lng: 77.7, traffic: 0.7, energy: 0.7, temp: 1, hum: 2, aqi: -4,
    zones: [['palayamkottai', 'Palayamkottai', 'Campus'], ['junction', 'Tirunelveli Junction', 'Transit'], ['melapalayam', 'Melapalayam', 'Residential'], ['town-market', 'Town Market', 'Market'], ['vannarpettai', 'Vannarpettai', 'Commercial'], ['kanyakumari-highway', 'Kanyakumari Highway', 'Highway']] },
  { id: 'erode', name: 'Erode', region: 'Western', lat: 11.34, lng: 77.72, traffic: 0.75, energy: 0.8, temp: 1.5, hum: -1, aqi: 3,
    zones: [['textile-market', 'Textile Market', 'Market'], ['junction', 'Erode Junction', 'Transit'], ['perundurai', 'Perundurai SIPCOT', 'Industrial'], ['surampatti', 'Surampatti', 'Residential'], ['brough-road', 'Brough Road', 'Commercial'], ['bhavani-road', 'Bhavani Highway', 'Highway']] },
  { id: 'vellore', name: 'Vellore', region: 'Northern', lat: 12.92, lng: 79.13, traffic: 0.75, energy: 0.7, temp: 2, hum: -2, aqi: 2,
    zones: [['vit', 'VIT Campus Area', 'Campus'], ['katpadi', 'Katpadi Junction', 'Transit'], ['fort', 'Fort and Collectorate', 'Heritage'], ['sathuvachari', 'Sathuvachari', 'Residential'], ['ranipet', 'Ranipet Leather Cluster', 'Industrial'], ['chittoor-bypass', 'Chittoor Bypass', 'Highway']] },
  { id: 'thoothukudi', name: 'Thoothukudi', region: 'South-east coast', lat: 8.76, lng: 78.13, traffic: 0.7, energy: 1.1, temp: 1, hum: 5, aqi: 10,
    zones: [['port', 'V.O.C. Port Area', 'Port'], ['sipcot', 'SIPCOT Industrial Complex', 'Industrial'], ['tiruchendur-road', 'Tiruchendur Road', 'Highway'], ['millerpuram', 'Millerpuram', 'Residential'], ['town-centre', 'Town Centre', 'Commercial'], ['fishing-harbour', 'Fishing Harbour Market', 'Market']] },
  { id: 'thanjavur', name: 'Thanjavur', region: 'Cauvery delta', lat: 10.79, lng: 79.14, traffic: 0.65, energy: 0.6, temp: 1, hum: 3, aqi: -3,
    zones: [['brihadisvara', 'Brihadisvara Temple Area', 'Heritage'], ['old-bus-stand', 'Old Bus Stand', 'Transit'], ['medical-college', 'Medical College Road', 'Campus'], ['gandhiji-road', 'Gandhiji Road Market', 'Market'], ['vallam', 'Vallam Industrial Estate', 'Industrial'], ['trichy-road', 'Trichy Road', 'Highway']] },
  { id: 'dindigul', name: 'Dindigul', region: 'South-central', lat: 10.37, lng: 77.98, traffic: 0.65, energy: 0.6, temp: 0, hum: -1, aqi: -2,
    zones: [['lock-cluster', 'Lock Industry Cluster', 'Industrial'], ['rock-fort', 'Rock Fort Area', 'Heritage'], ['junction', 'Dindigul Junction', 'Transit'], ['nagal-nagar', 'Nagal Nagar', 'Residential'], ['palani-road', 'Palani Road', 'Highway'], ['market', 'Dindigul Market', 'Market']] },
  { id: 'hosur', name: 'Hosur', region: 'North-western border', lat: 12.74, lng: 77.83, traffic: 0.8, energy: 1.1, temp: -2.5, hum: -4, aqi: 8,
    zones: [['sipcot', 'SIPCOT Industrial Area', 'Industrial'], ['bus-terminus', 'Hosur Bus Terminus', 'Transit'], ['bagalur-road', 'Bagalur Road', 'Residential'], ['bengaluru-highway', 'Hosur–Bengaluru Highway', 'Highway'], ['town-centre', 'Hosur Town Centre', 'Commercial'], ['electronics', 'Electronics Cluster', 'Tech']] },
];
export const CITIES = CITY_DEFS.map(({ zones, ...c }) => c);
export const CITY_BY_ID = Object.fromEntries(CITIES.map((c) => [c.id, c]));
// Flat list of every zone in every city; each zone knows its city and map slot.
export const ZONES = CITY_DEFS.flatMap((c) => c.zones.map(([slug, name, type], slot) => ({
  id: `${c.id}-${slug}`, city: c.id, slot, name, type,
  traffic: TYPES[type].t * c.traffic * (0.9 + ((slot * 7 + c.id.length) % 9) / 40),
  energy: Math.round(TYPES[type].e * c.energy),
  temp: c.temp + (type === 'Industrial' ? 1 : type === 'Heritage' || type === 'Residential' ? -0.3 : 0.4), hum: c.hum, aqi: c.aqi,
})));
const ZONE_INDEX = new Map(ZONES.map((z, i) => [z.id, i]));
const ZBC = {};
ZONES.forEach((z) => (ZBC[z.city] = ZBC[z.city] || []).push(z));
export const zonesOf = (cityId) => ZBC[cityId] || [];

// warn/crit are absolute, except energy (rel: multiples of the zone's baseline kW)
export const METRICS = {
  congestion: { label: 'Traffic Congestion', unit: '%', warn: 70, crit: 90, color: '#38bdf8' },
  aqi: { label: 'Air Quality (AQI)', unit: '', warn: 100, crit: 200, color: '#a78bfa' },
  temp: { label: 'Temperature', unit: '°C', warn: 38, crit: 42, color: '#fb923c' },
  humidity: { label: 'Humidity', unit: '%', warn: 85, crit: 95, color: '#2dd4bf' },
  energy: { label: 'Energy Consumption', unit: ' kW', warn: 1.25, crit: 1.5, rel: true, color: '#facc15' },
};
export const RANGES = {
  '1h': { label: '1H', ms: 36e5, step: 6e4 },
  '6h': { label: '6H', ms: 216e5, step: 3e5 },
  '24h': { label: '24H', ms: 864e5, step: 9e5 },
  '7d': { label: '7D', ms: 6048e5, step: 72e5 },
};
const RANK = { normal: 0, warning: 1, critical: 2 };
export const worstStatus = (arr) => arr.sort((a, b) => RANK[b] - RANK[a])[0];
const METRIC_INDEX = Object.fromEntries(Object.keys(METRICS).map((k, i) => [k, i]));

export function readingAt(zone, metric, t) {
  const zi = ZONE_INDEX.get(zone.id), mi = METRIC_INDEX[metric];
  const d = new Date(t), h = d.getHours() + d.getMinutes() / 60, wk = [0, 6].includes(d.getDay()) ? 0.7 : 1;
  const n = hash(zi, mi, Math.floor(t / 6e4)) - 0.5;
  const spike = hash(zi + 9, mi, Math.floor(t / 12e5)) > 0.985 ? 1 : 0; // occasional anomaly
  const rush = (bump(h, 8.5) + bump(h, 18)) * wk, wave = Math.sin(((h - 9) / 24) * 2 * Math.PI);
  const base = { congestion: 15 + 50 * zone.traffic * rush, aqi: 42 + zone.aqi + 45 * zone.traffic * rush,
    temp: 28 + zone.temp + 6 * wave, humidity: 64 + zone.hum - 14 * wave,
    energy: zone.energy * (0.65 + 0.3 * bump(h, 13, 6) + 0.4 * bump(h, 19)) * wk }[metric];
  const noise = n * { congestion: 8, aqi: 12, temp: 1, humidity: 4, energy: zone.energy * 0.06 }[metric];
  const boost = spike * { congestion: 30, aqi: 110, temp: 7, humidity: 12, energy: zone.energy * 0.45 }[metric];
  let v = Math.max(0, base + noise + boost);
  if (metric === 'congestion' || metric === 'humidity') v = Math.min(100, v);
  return Math.round(v * 10) / 10;
}
export const limits = (zone, metric) => { const m = METRICS[metric], k = m.rel ? zone.energy : 1; return { warn: m.warn * k, crit: m.crit * k }; };
export const statusOf = (zone, metric, v) => { const l = limits(zone, metric); return v >= l.crit ? 'critical' : v >= l.warn ? 'warning' : 'normal'; };

// A range is a key ('24h') or a custom spec {ms, step}.
export const resolveRange = (r) => (typeof r === 'string' ? RANGES[r] : r);
export const customRange = (startMs, endMs) => { const ms = endMs - startMs; return { ms, step: ms <= 36e5 ? 6e4 : ms <= 216e5 ? 3e5 : ms <= 864e5 ? 9e5 : 72e5, custom: true }; };
export function series(zone, metric, range, now) {
  const { ms, step } = resolveRange(range), out = [];
  for (let i = 0; i <= ms / step; i++) { const t = now - ms + i * step; out.push({ t, v: readingAt(zone, metric, t) }); }
  return out;
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
function aggSeries(zones, metric, range, now) {
  const ss = zones.map((z) => series(z, metric, range, now));
  return ss[0].map((p, i) => { const vs = ss.map((s) => s[i].v); return { t: p.t, v: metric === 'energy' ? vs.reduce((x, y) => x + y, 0) : mean(vs) }; });
}
// Average (energy = total) over any set of zones (a city, or the whole state) + comparison with the previous period.
export function summary(zones, metric, range, now) {
  const data = aggSeries(zones, metric, range, now), prev = aggSeries(zones, metric, range, now - resolveRange(range).ms);
  const vals = data.map((p) => p.v), avg = mean(vals), prevAvg = mean(prev.map((p) => p.v));
  const last = vals[vals.length - 1], first = vals[0];
  const status = worstStatus(zones.map((z) => statusOf(z, metric, readingAt(z, metric, now))));
  return { data, status, avg, peak: Math.max(...vals), low: Math.min(...vals), delta: prevAvg ? ((avg - prevAvg) / prevAvg) * 100 : 0,
    value: +last.toFixed(metric === 'aqi' || metric === 'energy' ? 0 : 1), change: first ? ((last - first) / first) * 100 : 0 };
}
// Current snapshot of a whole city: average (energy = total) per metric, status = worst zone.
export function cityNow(cityId, now) {
  const zs = zonesOf(cityId), metrics = {};
  Object.keys(METRICS).forEach((m) => {
    const vs = zs.map((z) => readingAt(z, m, now)), v = m === 'energy' ? vs.reduce((a, b) => a + b, 0) : mean(vs);
    metrics[m] = { value: m === 'aqi' || m === 'energy' ? Math.round(v) : +v.toFixed(1), status: worstStatus(zs.map((z, i) => statusOf(z, m, vs[i]))) };
  });
  return { metrics, status: worstStatus(Object.values(metrics).map((x) => x.status)) };
}
export function buildAlerts(now) { // threshold crossings in the last 6h on a 5-minute grid, for every zone in every city
  const out = [], G = 3e5, end = Math.floor(now / G) * G;
  ZONES.forEach((z) => Object.keys(METRICS).forEach((m) => {
    let prev = 'normal', last = null;
    for (let t = end - 216e5; t <= end; t += G) {
      const v = readingAt(z, m, t), s = statusOf(z, m, v);
      if (s !== 'normal' && s !== prev) { last = { id: `${z.id}-${m}-${t / G}`, zone: z, metric: m, severity: s, value: v, t, limit: limits(z, m)[s === 'critical' ? 'crit' : 'warn'], resolved: true, sensorId: sensorIdFor(z.id, m) }; out.push(last); }
      prev = s;
    }
    if (last && prev !== 'normal') last.resolved = false;
  }));
  return out.sort((a, b) => b.t - a.t);
}
const STYPES = [['traffic', 'Traffic Counter'], ['air', 'Weather / Air Station'], ['energy', 'Energy Meter']];
export const SENSORS = ZONES.flatMap((z, zi) => STYPES.map(([type, label], ti) => {
  const r = hash(zi, ti, 99);
  return { id: `${z.id.toUpperCase()}-${type.toUpperCase()}-01`, zone: z, type, label, seed: zi * 3 + ti, status: r > 0.97 ? 'offline' : r > 0.92 ? 'faulty' : 'active' };
}));
const SBC = {};
SENSORS.forEach((s) => (SBC[s.zone.city] = SBC[s.zone.city] || []).push(s));
export const sensorsOf = (cityId) => SBC[cityId] || [];
export const lastSeen = (s, now) => s.status === 'active' ? 1 + Math.floor(hash(s.seed, 1, Math.floor(now / 5000)) * 14) : s.status === 'faulty' ? 190 : 2820;
export const SENSOR_METRICS = { traffic: ['congestion'], air: ['aqi', 'temp', 'humidity'], energy: ['energy'] };
export const sensorIdFor = (zoneId, metric) => SENSORS.find((s) => s.zone.id === zoneId && SENSOR_METRICS[s.type].includes(metric))?.id;
// SIMULATED device health values (no real devices are connected).
export function sensorHealth(s, now) {
  const j = (k, r) => Math.floor(hash(s.seed, k, 7) * r);
  return {
    health: s.status === 'active' ? 96 + j(2, 4) : s.status === 'faulty' ? 58 : 0,
    battery: s.type === 'energy' ? null : 40 + j(3, 55) - (s.status === 'faulty' ? 25 : 0),
    signal: s.status === 'offline' ? 0 : 55 + j(4, 45),
    uptime: s.status === 'active' ? 99 + j(5, 10) / 10 : s.status === 'faulty' ? 91.4 : 62.8,
    firmware: `v1.${2 + j(6, 4)}.${j(7, 9)}`,
  };
}
