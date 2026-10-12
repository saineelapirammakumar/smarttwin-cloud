import { useEffect, useState } from 'react';
import useNow from './hooks/useNow';
import { CITIES, CITY_BY_ID, customRange, hasData, loadAlerts, loadCatalog, loadSeries, refreshLive, updateAlert, zonesOf, sensorsOf } from './data/dataSource';
import { toInput } from './utils/format';
import Sidebar from './components/Sidebar';
import Filters from './components/Filters';
import SimBanner from './components/SimBanner';
import Charts from './components/Charts';
import { EmptyState, ErrorState, LoadingState } from './components/StateViews';
import Overview from './pages/Overview';
import StatePage from './pages/StatePage';
import ComparePage from './pages/ComparePage';
import ZonesPage from './pages/ZonesPage';
import AlertsPage from './pages/AlertsPage';
import SensorsPage from './pages/SensorsPage';
const TITLES = { state: 'Tamil Nadu overview', overview: 'City overview', zones: 'Zone monitoring', traffic: 'Traffic monitoring', environment: 'Environmental monitoring', energy: 'Energy monitoring', alerts: 'Alerts and incidents', sensors: 'Sensor status', compare: 'City comparison' };
const CITY_PAGES = ['overview', 'zones', 'traffic', 'environment', 'energy', 'alerts', 'sensors']; // pages that show one city
export default function App() {
  const [page, setPage] = useState('state'), [city, setCity] = useState('chennai'), [zone, setZone] = useState('all'), [range, setRange] = useState('24h');
  const [custom, setCustom] = useState(() => ({ start: toInput(Date.now() - 1728e5), end: toInput(Date.now()) }));
  const [catalog, setCatalog] = useState({ status: 'loading' }), [hist, setHist] = useState({ key: '', status: 'idle' });
  const [allAlerts, setAllAlerts] = useState([]), [live, setLive] = useState({ at: null, error: null }), [actionError, setActionError] = useState(null);
  const [, setTick] = useState(0);
  const now = useNow(5000), bump = () => setTick((t) => t + 1);
  const ready = catalog.status === 'ready';
  const selectCity = (id) => { setCity(id); setZone('all'); };

  // Custom date range: validate, then use it as a fixed chart window.
  const cs = new Date(custom.start).getTime(), ce = new Date(custom.end).getTime();
  const customError = range !== 'custom' ? '' : !(cs < ce) ? 'End must be after start' : ce - cs > 12096e5 ? 'Maximum range is 14 days' : ce > now + 6e4 ? 'End cannot be in the future' : '';
  const useCustom = range === 'custom' && !customError;
  const spec = useCustom ? customRange(cs, ce) : range === 'custom' ? '24h' : range, effNow = useCustom ? ce : now;
  const isCity = CITY_PAGES.includes(page);
  const cityIds = isCity ? [city] : CITIES.map((c) => c.id);
  const histKey = ready ? [cityIds.join(','), typeof spec === 'string' ? spec : `${spec.ms}:${spec.step}`, useCustom ? ce : 'live'].join('|') : '';

  const boot = () => { setCatalog({ status: 'loading' }); loadCatalog().then(() => setCatalog({ status: 'ready' })).catch((error) => setCatalog({ status: 'error', error })); };
  useEffect(boot, []);
  useEffect(() => { // load chart history whenever the city, page scope or time range changes
    if (!histKey) return;
    setHist({ key: histKey, status: 'loading' });
    loadSeries(cityIds, spec, effNow).then(() => setHist({ key: histKey, status: 'ready' })).catch((error) => setHist({ key: histKey, status: 'error', error }));
  }, [histKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const fast = Math.floor(now / 10000), slow = Math.floor(now / 30000);
  useEffect(() => { // every 10 s: latest values, sensor status and alerts
    if (!ready) return undefined;
    let on = true;
    Promise.all([refreshLive(), loadAlerts()]).then(([, a]) => { if (on) { setAllAlerts(a); setLive({ at: Date.now(), error: null }); bump(); } })
      .catch((e) => on && setLive((l) => ({ ...l, error: e.message })));
    return () => { on = false; };
  }, [ready, fast]);
  useEffect(() => { // every 30 s: refresh chart history (live ranges only)
    if (ready && hist.key === histKey && hist.status === 'ready' && !useCustom) loadSeries(cityIds, spec, effNow).then(bump).catch(() => {});
  }, [slow]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeAlert = (status) => async (id) => {
    try { setActionError(null); await updateAlert(id, status); setAllAlerts(await loadAlerts()); } catch (e) { setActionError(e.message); }
  };
  const onAck = changeAlert('acknowledged'), onResolve = changeAlert('resolved');

  const cityZones = zonesOf(city), zones = zone === 'all' ? cityZones : cityZones.filter((z) => z.id === zone);
  const cityAlerts = allAlerts.filter((a) => a.zone.city === city), alerts = cityAlerts.filter((a) => zone === 'all' || a.zone.id === zone);
  const sensors = sensorsOf(city).filter((s) => zone === 'all' || s.zone.id === zone);
  const common = { zones, range: spec, now, effNow };
  const badge = (isCity ? cityAlerts : allAlerts).filter((a) => a.state === 'open').length;

  let body;
  if (catalog.status === 'loading') body = <LoadingState text="Connecting to the SmartTwin backend…" />;
  else if (catalog.status === 'error') body = <ErrorState error={catalog.error} onRetry={boot} />;
  else if (!hasData()) body = <EmptyState title="The database has no readings yet" hint="Run the seed script and start the simulator (see README), then check again." onRetry={boot} />;
  else if (hist.key !== histKey || hist.status === 'loading') body = <LoadingState text="Loading chart data…" />;
  else if (hist.status === 'error') body = <ErrorState error={hist.error} title="Cannot load chart data" onRetry={() => setHist({ key: '', status: 'idle' })} />;
  else body = (
    <>
      {page === 'state' && <StatePage city={city} onCity={selectCity} onNav={setPage} alerts={allAlerts} now={now} range={spec} effNow={effNow} />}
      {page === 'compare' && <ComparePage city={city} alerts={allAlerts} now={now} range={spec} effNow={effNow} />}
      {page === 'overview' && <Overview {...common} city={city} cityZones={cityZones} zone={zone} onZone={setZone} alerts={alerts} onAck={onAck} sensors={sensors} onNav={setPage} />}
      {page === 'zones' && <ZonesPage {...common} city={city} onCity={selectCity} cityZones={cityZones} zone={zone} onZone={setZone} />}
      {page === 'traffic' && <Charts metrics={['congestion']} {...common} now={effNow} />}
      {page === 'environment' && <Charts metrics={['temp', 'humidity', 'aqi']} {...common} now={effNow} />}
      {page === 'energy' && <Charts metrics={['energy']} {...common} now={effNow} />}
      {page === 'alerts' && <AlertsPage alerts={alerts} now={now} onAck={onAck} onResolve={onResolve} />}
      {page === 'sensors' && <SensorsPage sensors={sensors} now={now} range={spec} effNow={effNow} />}
    </>);
  return (
    <div className="app">
      <Sidebar page={page} onNav={setPage} alertCount={badge} />
      <main>
        <header className="top">
          <div><h1>{isCity ? `${CITY_BY_ID[city]?.name ?? city}: ${TITLES[page]}` : TITLES[page]}</h1>
            <div className="muted"><i className={`dot ${live.error ? 'critical' : 'normal'}`} /> {live.at ? `Backend connected · updated ${new Date(live.at).toLocaleTimeString()} · refreshes every 10s` : 'Connecting…'}{useCustom && ' · charts show a fixed custom range'}</div></div>
          {ready && <Filters city={city} onCity={selectCity} zones={cityZones} zone={zone} onZone={setZone} showZone={isCity} range={range} onRange={setRange} custom={custom} onCustom={setCustom} error={customError} />}
        </header>
        <SimBanner />
        {live.error && <div className="banner warn">Lost connection to the backend ({live.error}). Showing the last data received.</div>}
        {actionError && <div className="banner warn" role="alert">Could not update the alert: {actionError}</div>}
        {body}
      </main>
    </div>
  );
}
