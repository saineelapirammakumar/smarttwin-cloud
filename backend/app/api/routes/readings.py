from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_city_or_404
from app.db.session import get_db
from app.schemas.reading import LatestReadingOut, ReadingOut, TimeseriesOut
from app.schemas.sensor import SensorType
from app.services import readings as svc

router = APIRouter(prefix="/readings", tags=["Readings"])


def _check(db: Session, city_id, zone_id, sensor_id):
    from app.models import Sensor, Zone  # local import keeps the module header small
    if city_id:
        get_city_or_404(city_id)
    if zone_id and db.get(Zone, zone_id) is None:
        raise HTTPException(404, f"Zone '{zone_id}' not found.")
    if sensor_id and db.get(Sensor, sensor_id) is None:
        raise HTTPException(404, f"Sensor '{sensor_id}' not found.")


@router.get("", response_model=list[ReadingOut], summary="Historical readings, oldest first (default: last 24 hours)")
def list_readings(city_id: str | None = None, zone_id: str | None = None, sensor_id: str | None = None, metric: SensorType | None = None,
                  start: datetime | None = None, end: datetime | None = None, limit: int = Query(1000, ge=1, le=5000), offset: int = Query(0, ge=0),
                  db: Session = Depends(get_db)):
    _check(db, city_id, zone_id, sensor_id)
    return svc.query_readings(db, city_id=city_id, zone_id=zone_id, sensor_id=sensor_id, metric=metric, start=start, end=end, limit=limit, offset=offset)


@router.get("/latest", response_model=list[LatestReadingOut], summary="Latest reading of every sensor")
def latest(city_id: str | None = None, zone_id: str | None = None, db: Session = Depends(get_db)):
    _check(db, city_id, zone_id, None)
    return svc.latest_readings(db, city_id, zone_id)


@router.get("/timeseries", response_model=TimeseriesOut, summary="Average readings per time bucket (for charts)")
def get_timeseries(start: datetime, end: datetime, bucket_seconds: int = Query(900, ge=1, le=86400), city_id: str | None = None,
                   zone_id: str | None = None, metric: SensorType | None = None, db: Session = Depends(get_db)):
    _check(db, city_id, zone_id, None)
    return svc.timeseries(db, city_id=city_id, zone_id=zone_id, metric=metric, start=start, end=end, bucket_seconds=bucket_seconds)
