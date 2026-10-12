import { useState } from 'react';
import SensorStatus from '../components/SensorStatus';
import SensorDetail from '../components/SensorDetail';
export default function SensorsPage({ sensors, now, range, effNow }) {
  const [sel, setSel] = useState(null);
  return (
    <div className="two">
      <SensorStatus sensors={sensors} now={now} filterable onSelect={setSel} selectedId={sel} />
      <SensorDetail sensor={sensors.find((s) => s.id === sel)} now={now} range={range} effNow={effNow} />
    </div>
  );
}
