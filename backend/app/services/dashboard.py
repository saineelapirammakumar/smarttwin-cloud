from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.thresholds import RULES, SENSOR_TYPES, classify
from app.models import Alert, Sensor, Zone
from app.schemas.city import CityOut
from app.schemas.dashboard import AlertCounts, CityMetricsOut, MetricSummary, SensorCounts, ZoneMetrics

_RANK = {"normal": 0, "warning": 1, "critical": 2}


def _status(sensor_type: str, value, baseline) -> str:
    return "no_data" if value is None else classify(sensor_type, value, baseline) or "normal"


def _worst(statuses) -> str:
    known = [s for s in statuses if s in _RANK]
    return max(known, key=_RANK.get) if known else "no_data"


def city_metrics(db: Session, city: dict) -> CityMetricsOut:
    zones = list(db.scalars(select(Zone).where(Zone.city_id == city["id"]).order_by(Zone.sort_order, Zone.name)))
    sensors = list(db.scalars(select(Sensor).where(Sensor.zone_id.in_([z.id for z in zones]))))
    by_zone: dict[str, dict[str, Sensor]] = {}
    for s in sensors:
        by_zone.setdefault(s.zone_id, {})[s.sensor_type] = s
    zone_out, values = [], {t: [] for t in SENSOR_TYPES}
    city_status = {t: [] for t in SENSOR_TYPES}
    for z in zones:
        base, ms = (z.meta or {}).get("energy_baseline_kw"), {}
        for t in SENSOR_TYPES:
            s = by_zone.get(z.id, {}).get(t)
            v = s.last_value if s else None
            ms[t] = MetricSummary(value=v, unit=RULES[t].unit, status=_status(t, v, base))
            city_status[t].append(ms[t].status)
            if v is not None:
                values[t].append(v)
        zone_out.append(ZoneMetrics(zone_id=z.id, name=z.name, category=z.category, status=_worst(m.status for m in ms.values()), metrics=ms))
    agg = {}
    for t in SENSOR_TYPES:
        v = None if not values[t] else (sum(values[t]) if t == "energy" else sum(values[t]) / len(values[t]))
        agg[t] = MetricSummary(value=None if v is None else round(v, 1), unit=RULES[t].unit, status=_worst(city_status[t]))
    counts = dict(db.execute(select(Alert.status, func.count()).join(Zone, Alert.zone_id == Zone.id).where(Zone.city_id == city["id"]).group_by(Alert.status)).all())
    crit = db.scalar(select(func.count()).select_from(Alert).join(Zone, Alert.zone_id == Zone.id)
                     .where(Zone.city_id == city["id"], Alert.severity == "critical", Alert.status.in_(("open", "acknowledged")))) or 0
    st = [s.status for s in sensors]
    return CityMetricsOut(city=CityOut(**city), generated_at=datetime.now(timezone.utc), data_source="simulated", metrics=agg, zones=zone_out,
                          sensors=SensorCounts(total=len(st), active=st.count("active"), faulty=st.count("faulty"), offline=st.count("offline")),
                          alerts=AlertCounts(open=counts.get("open", 0), acknowledged=counts.get("acknowledged", 0), resolved=counts.get("resolved", 0), active_critical=crit))
