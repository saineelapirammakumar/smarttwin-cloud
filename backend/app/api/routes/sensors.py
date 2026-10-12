from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_city_or_404, get_sensor_or_404
from app.core.config import Settings, get_settings
from app.core.thresholds import VALID_RANGE
from app.db.session import get_db
from app.schemas.reading import ReadingCreate, ReadingCreated, ReadingOut
from app.schemas.alert import AlertOut
from app.schemas.sensor import SensorOut, SensorStatus, SensorType
from app.services import alerts as alert_service
from app.services import readings as reading_service
from app.services import sensors as sensor_service
from app.services.ingest import NewReading, ingest

router = APIRouter(prefix="/sensors", tags=["Sensors"])


@router.get("", response_model=list[SensorOut], summary="List sensors (filter by city, zone, type, status)")
def list_sensors(city_id: str | None = None, zone_id: str | None = None, sensor_type: SensorType | None = None, status: SensorStatus | None = None,
                 limit: int = Query(100, ge=1, le=1000), offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    if city_id:
        get_city_or_404(city_id)
    return sensor_service.list_sensors(db, city_id, zone_id, sensor_type, status, limit, offset)


@router.get("/{sensor_id}", response_model=SensorOut, summary="Get one sensor")
def get_sensor(row=Depends(get_sensor_or_404)):
    return sensor_service.to_out(*row)


@router.get("/{sensor_id}/readings", response_model=list[ReadingOut], summary="Readings of one sensor, oldest first")
def sensor_readings(start: datetime | None = None, end: datetime | None = None, limit: int = Query(500, ge=1, le=5000), offset: int = Query(0, ge=0),
                    row=Depends(get_sensor_or_404), db: Session = Depends(get_db)):
    return reading_service.query_readings(db, sensor_id=row[0].id, start=start, end=end, limit=limit, offset=offset)


@router.post("/{sensor_id}/readings", response_model=ReadingCreated, status_code=201, summary="Submit a validated reading")
def create_reading(body: ReadingCreate, row=Depends(get_sensor_or_404), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    sensor, zone = row
    lo, hi = VALID_RANGE[sensor.sensor_type]
    if not lo <= body.value <= hi:
        raise HTTPException(422, f"Value {body.value:g} is outside the valid range {lo} to {hi} {sensor.unit} for a {sensor.sensor_type} sensor.")
    ts = reading_service.as_utc(body.recorded_at) or datetime.now(timezone.utc)
    if ts > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise HTTPException(422, "recorded_at cannot be in the future.")
    res = ingest(db, [NewReading(sensor, body.value, ts, body.data_source, body.meta)], cooldown_seconds=settings.alert_cooldown_seconds, return_rows=True)
    db.commit()
    event = res.events[0] if res.events else None
    return ReadingCreated(reading=reading_service.to_reading_out(res.readings[0], sensor, zone.city_id),
                          alert_action=event.action if event else None,
                          alert=alert_service.get_alert(db, event.alert.id) if event else None)
