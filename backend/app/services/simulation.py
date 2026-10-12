"""SIMULATED sensor data generator: daily rush-hour patterns, noise and rare anomalies (so alerts happen).
All values it produces are labelled 'simulated'. It is NOT real or official data."""
import math
import zlib
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.thresholds import VALID_RANGE
from app.models import Sensor, SensorReading
from app.services.ingest import NewReading, ingest

_METRIC_INDEX = {"traffic": 0, "aqi": 1, "temperature": 2, "humidity": 3, "energy": 4}
OFFLINE_GAP = timedelta(minutes=45)  # offline sensors stopped reporting this long before the seed time


def _hash(a: float, b: float, c: float) -> float:
    x = math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453
    return x - math.floor(x)


def _bump(h: float, centre: float, width: float = 4.0) -> float:
    return math.exp(-((h - centre) ** 2) / width)


@lru_cache
def _tz(name: str) -> ZoneInfo:
    return ZoneInfo(name)


def value_at(zone_id: str, meta: dict, sensor_type: str, ts: datetime, tz_name: str = "Asia/Kolkata") -> float:
    """Deterministic plausible value for a zone's metric at a time (same inputs give the same output)."""
    zi, mi, t_ms = zlib.crc32(zone_id.encode()) % 1000, _METRIC_INDEX[sensor_type], int(ts.timestamp() * 1000)
    d = ts.astimezone(_tz(tz_name))
    hour, weekend = d.hour + d.minute / 60, (0.7 if d.weekday() >= 5 else 1.0)
    noise_unit = _hash(zi, mi, t_ms // 60_000) - 0.5
    spike = 1 if _hash(zi + 9, mi, t_ms // 1_200_000) > 0.985 else 0  # rare 20-minute anomaly
    rush = (_bump(hour, 8.5) + _bump(hour, 18)) * weekend
    wave = math.sin((hour - 9) / 24 * 2 * math.pi)
    traffic, energy = meta.get("traffic_factor", 0.8), meta.get("energy_baseline_kw", 400)
    base = {"traffic": 15 + 50 * traffic * rush, "aqi": 42 + meta.get("aqi_offset", 0) + 45 * traffic * rush,
            "temperature": 28 + meta.get("temp_offset_c", 0) + 6 * wave, "humidity": 64 + meta.get("humidity_offset", 0) - 14 * wave,
            "energy": energy * (0.65 + 0.3 * _bump(hour, 13, 6) + 0.4 * _bump(hour, 19)) * weekend}[sensor_type]
    noise = noise_unit * {"traffic": 8, "aqi": 12, "temperature": 1, "humidity": 4, "energy": energy * 0.06}[sensor_type]
    boost = spike * {"traffic": 30, "aqi": 110, "temperature": 7, "humidity": 12, "energy": energy * 0.45}[sensor_type]
    lo, hi = VALID_RANGE[sensor_type]
    return round(min(hi, max(lo, base + noise + boost)), 1)


def _sensors(db: Session, cities: list[str] | None = None) -> list[Sensor]:
    q = select(Sensor).options(joinedload(Sensor.zone)).order_by(Sensor.id)
    sensors = list(db.scalars(q).unique())
    return [s for s in sensors if not cities or s.zone.city_id in cities]


def run_tick(db: Session, now: datetime | None = None, cities: list[str] | None = None, cooldown_seconds: int | None = None) -> dict:
    """One simulator step: one reading per reporting sensor, stored in PostgreSQL, alerts evaluated."""
    now, tz = now or datetime.now(timezone.utc), get_settings().sim_timezone
    items = [NewReading(s, value_at(s.zone_id, s.zone.meta or {}, s.sensor_type, now, tz), now, "simulated",
                        {"quality": "degraded"} if s.status == "faulty" else None)
             for s in _sensors(db, cities) if s.status != "offline"]
    res = ingest(db, items, cooldown_seconds=cooldown_seconds)
    db.commit()
    return {"readings": res.count, "alert_events": len(res.events)}


def backfill(db: Session, now: datetime | None = None, days: int = 7, cooldown_seconds: int | None = None) -> dict:
    """Creates sample history: every 5 min for the last 6 hours, every 30 min before that. Alerts are
    evaluated for the last 6 hours only. Offline sensors stop 45 minutes before 'now'."""
    now, tz = (now or datetime.now(timezone.utc)), get_settings().sim_timezone
    end = now.replace(second=0, microsecond=0, minute=now.minute - now.minute % 5)
    tail_start = end - timedelta(hours=6)
    times = [tail_start + timedelta(minutes=5 * k) for k in range(73)]
    older = tail_start - timedelta(minutes=30)
    while older >= end - timedelta(days=days):
        times.append(older)
        older -= timedelta(minutes=30)
    times.sort()
    sensors, total, events = _sensors(db), 0, 0
    for k in range(0, len(times), 24):  # chunk by time so alert state stays chronological
        items = [NewReading(s, value_at(s.zone_id, s.zone.meta or {}, s.sensor_type, t, tz), t, "simulated")
                 for t in times[k:k + 24] for s in sensors if s.status != "offline" or t <= now - OFFLINE_GAP]
        res = ingest(db, items, evaluate_alerts_from=tail_start, cooldown_seconds=cooldown_seconds)
        total, events = total + res.count, events + len(res.events)
        db.commit()
    return {"readings": total, "alert_events": events}


def prune_old_readings(db: Session, retention_days: int, now: datetime | None = None) -> int:
    """Keeps database growth bounded: deletes readings older than retention_days."""
    cutoff = (now or datetime.now(timezone.utc)) - timedelta(days=retention_days)
    n = db.execute(delete(SensorReading).where(SensorReading.recorded_at < cutoff)).rowcount
    db.commit()
    return n
