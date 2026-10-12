import { useState } from 'react';
import CityMap from '../components/CityMap';
import ZoneDetail from '../components/ZoneDetail';
import Charts from '../components/Charts';
export default function ZonesPage({ city, onCity, cityZones, zone, onZone, zones, now, range, effNow }) {
  const [layer, setLayer] = useState('status');
  return (
    <>
      <div className="two">
        <CityMap now={now} city={city} onCity={onCity} zone={zone} onZone={onZone} layer={layer} onLayer={setLayer} openOnSelect />
        <ZoneDetail zone={cityZones.find((z) => z.id === zone)} now={now} range={range} effNow={effNow} />
      </div>
      <Charts metrics={['congestion', 'aqi', 'temp', 'humidity', 'energy']} zones={zones} range={range} now={effNow} />
    </>
  );
}
