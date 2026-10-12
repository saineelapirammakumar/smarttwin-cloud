from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Sensor, SensorReading, Zone
from app.schemas.reading import LatestReadingOut, ReadingOut, SeriesOut, TimeseriesOut

MAX_POINTS = 20000


def as_utc(dt: datetime | None) -> datetime | None:
    return None if dt is None else (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc))


def check_window(start, end):
    start, end = as_utc(start), as_utc(end)
    if start and end and start >= end:
        raise HTTPException(422, "'start' must be earlier than 'end'.")
    return start, end


def query_readings(db: Session, *, city_id=None, zone_id=None, sensor_id=None, metric=None, start=None, end=None, limit=1000, offset=0) -> list[ReadingOut]:
    start, end = check_window(start, end)
    if start is None and end is None:
        start = datetime.now(timezone.utc) - timedelta(hours=24)  # sensible default window
    q = (select(SensorReading, Sensor, Zone.city_id).join(Sensor, SensorReading.sensor_id == Sensor.id).join(Zone, Sensor.zone_id == Zone.id))
    for col, val in ((Zone.city_id, city_id), (Sensor.zone_id, zone_id), (SensorReading.sensor_id, sensor_id), (Sensor.sensor_type, metric)):
        if val:
            q = q.where(col == val)
    if start:
        q = q.where(SensorReading.recorded_at >= start)
    if end:
        q = q.where(SensorReading.recorded_at <= end)
    rows = db.execute(q.order_by(SensorReading.recorded_at, SensorReading.id).limit(limit).offset(offset)).all()  # chronological
    return [ReadingOut(id=r.id, sensor_id=s.id, zone_id=s.zone_id, city_id=c, metric=s.sensor_type, value=r.value, unit=s.unit,
                       recorded_at=r.recorded_at, data_source=r.data_source) for r, s, c in rows]


def to_reading_out(r: SensorReading, s: Sensor, city_id: str) -> ReadingOut:
    return ReadingOut(id=r.id, sensor_id=s.id, zone_id=s.zone_id, city_id=city_id, metric=s.sensor_type, value=r.value, unit=s.unit,
                      recorded_at=r.recorded_at, data_source=r.data_source)


def latest_readings(db: Session, city_id=None, zone_id=None) -> list[LatestReadingOut]:
    q = select(Sensor, Zone.city_id).join(Zone, Sensor.zone_id == Zone.id).where(Sensor.last_reading_at.is_not(None))
    if city_id:
        q = q.where(Zone.city_id == city_id)
    if zone_id:
        q = q.where(Sensor.zone_id == zone_id)
    return [LatestReadingOut(sensor_id=s.id, zone_id=s.zone_id, city_id=c, metric=s.sensor_type, value=s.last_value, unit=s.unit,
                             recorded_at=s.last_reading_at, sensor_status=s.status, data_source=s.data_source)
            for s, c in db.execute(q.order_by(Sensor.id)).all()]


def timeseries(db: Session, *, city_id=None, zone_id=None, metric=None, start: datetime, end: datetime, bucket_seconds: int) -> TimeseriesOut:
    start, end = check_window(start, end)
    if start is None or end is None:
        raise HTTPException(422, "'start' and 'end' are required.")
    if (end - start).total_seconds() / bucket_seconds > MAX_POINTS:
        raise HTTPException(422, "Too many points requested. Use a larger bucket_seconds or a shorter time range.")
    bucket = func.floor(func.extract("epoch", SensorReading.recorded_at) / bucket_seconds).label("b")
    q = (select(Sensor.zone_id, Sensor.sensor_type, bucket, func.avg(SensorReading.value))
         .join(Sensor, SensorReading.sensor_id == Sensor.id).join(Zone, Sensor.zone_id == Zone.id)
         .where(SensorReading.recorded_at >= start, SensorReading.recorded_at <= end))
    for col, val in ((Zone.city_id, city_id), (Sensor.zone_id, zone_id), (Sensor.sensor_type, metric)):
        if val:
            q = q.where(col == val)
    rows = db.execute(q.group_by(Sensor.zone_id, Sensor.sensor_type, bucket).order_by(Sensor.zone_id, Sensor.sensor_type, bucket)).all()
    series: dict[tuple, list] = {}
    for z, m, b, v in rows:
        series.setdefault((z, m), []).append([int(b) * bucket_seconds * 1000, round(float(v), 2)])
    return TimeseriesOut(bucket_seconds=bucket_seconds, start=start, end=end, series=[SeriesOut(zone_id=z, metric=m, points=p) for (z, m), p in series.items()])
