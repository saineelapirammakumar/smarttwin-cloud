from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_city_or_404
from app.db.session import get_db
from app.models import Sensor, Zone
from app.schemas.zone import ZoneOut

router = APIRouter(prefix="/zones", tags=["Cities and zones"])


@router.get("", response_model=list[ZoneOut], summary="List all zones (optionally one city)")
def list_zones(city_id: str | None = None, db: Session = Depends(get_db)):
    if city_id:
        get_city_or_404(city_id)
    q = select(Zone, func.count(Sensor.id)).outerjoin(Sensor, Sensor.zone_id == Zone.id).group_by(Zone.id)
    if city_id:
        q = q.where(Zone.city_id == city_id)
    return [ZoneOut(id=z.id, city_id=z.city_id, name=z.name, category=z.category, sort_order=z.sort_order, meta=z.meta or {}, sensor_count=n)
            for z, n in db.execute(q.order_by(Zone.city_id, Zone.sort_order, Zone.name)).all()]
