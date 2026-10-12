from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Sensor, Zone
from app.schemas.zone import ZoneOut


def list_zones_for_city(db: Session, city_id: str) -> list[ZoneOut]:
    rows = db.execute(
        select(Zone, func.count(Sensor.id))
        .outerjoin(Sensor, Sensor.zone_id == Zone.id)
        .where(Zone.city_id == city_id)
        .group_by(Zone.id)
        .order_by(Zone.sort_order, Zone.name)
    ).all()
    return [ZoneOut(id=z.id, city_id=z.city_id, name=z.name, category=z.category, sort_order=z.sort_order,
                    meta=z.meta or {}, sensor_count=n) for z, n in rows]
