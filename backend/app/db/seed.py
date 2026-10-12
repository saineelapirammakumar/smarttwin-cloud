"""Safe, repeatable seed: adds missing zones and sensors (never deletes or overwrites), then creates sample
history only if the readings table is empty. Run:  python -m app.db.seed   (add --no-history to skip history)"""
import argparse
import sys
import zlib

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.thresholds import SENSOR_CODES, SENSOR_LABELS, SENSOR_TYPES
from app.data.catalog import ZONE_DEFS
from app.db.session import get_engine
from app.models import Sensor, SensorReading, Zone
from app.services.simulation import backfill

UNITS = {"traffic": "%", "aqi": "AQI", "temperature": "°C", "humidity": "%", "energy": "kW"}


def sensor_status(sensor_id: str) -> str:
    """Deterministic sample statuses: about 3% offline and 5% faulty."""
    r = zlib.crc32(sensor_id.encode()) % 100
    return "offline" if r < 3 else "faulty" if r < 8 else "active"


def seed_catalog(db: Session) -> dict:
    zones = [{"id": z["id"], "city_id": z["city_id"], "name": z["name"], "category": z["category"], "sort_order": z["sort_order"], "meta": z["meta"]} for z in ZONE_DEFS]
    sensors = [{"id": f"{z['id'].upper()}-{SENSOR_CODES[t]}-01", "zone_id": z["id"], "sensor_type": t, "name": f"{z['name']} {SENSOR_LABELS[t]}",
                "unit": UNITS[t], "status": sensor_status(f"{z['id'].upper()}-{SENSOR_CODES[t]}-01"), "data_source": "simulated"}
               for z in ZONE_DEFS for t in SENSOR_TYPES]
    count = lambda model: db.scalar(select(func.count()).select_from(model))  # noqa: E731
    z0, s0 = count(Zone), count(Sensor)
    db.execute(pg_insert(Zone).values(zones).on_conflict_do_nothing(index_elements=["id"]))
    db.execute(pg_insert(Sensor).values(sensors).on_conflict_do_nothing(index_elements=["id"]))
    db.commit()
    return {"zones_added": count(Zone) - z0, "sensors_added": count(Sensor) - s0}


def seed(db: Session, with_history: bool = True, days: int = 7) -> dict:
    out = seed_catalog(db)
    if with_history and db.scalar(select(func.count()).select_from(SensorReading)) == 0:
        out["history"] = backfill(db, days=days)
    elif with_history:
        out["history"] = "skipped (readings already exist)"
    return out


def main() -> int:
    p = argparse.ArgumentParser(description="Seed zones, sensors and sample (simulated) history.")
    p.add_argument("--no-history", action="store_true", help="only create zones and sensors")
    p.add_argument("--days", type=int, default=7, help="days of simulated history (default 7)")
    args = p.parse_args()
    settings = get_settings()
    if not settings.database_url:
        print("DATABASE_URL is not set. Create backend/.env first (see README).")
        return 1
    with Session(get_engine(settings)) as db:
        print(seed(db, with_history=not args.no_history, days=args.days))
    return 0


if __name__ == "__main__":
    sys.exit(main())
