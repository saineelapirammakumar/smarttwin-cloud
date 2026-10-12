from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Sensor, Zone
from app.schemas.sensor import SensorOut


def to_out(s: Sensor, z: Zone) -> SensorOut:
    return SensorOut(id=s.id, zone_id=z.id, zone_name=z.name, city_id=z.city_id, sensor_type=s.sensor_type, name=s.name, unit=s.unit,
                     status=s.status, data_source=s.data_source, last_value=s.last_value, last_reading_at=s.last_reading_at, created_at=s.created_at)


def list_sensors(db: Session, city_id=None, zone_id=None, sensor_type=None, status=None, limit=100, offset=0) -> list[SensorOut]:
    q = select(Sensor, Zone).join(Zone, Sensor.zone_id == Zone.id)
    for col, val in ((Zone.city_id, city_id), (Sensor.zone_id, zone_id), (Sensor.sensor_type, sensor_type), (Sensor.status, status)):
        if val:
            q = q.where(col == val)
    rows = db.execute(q.order_by(Zone.city_id, Zone.sort_order, Sensor.id).limit(limit).offset(offset)).all()
    return [to_out(s, z) for s, z in rows]


def get_sensor(db: Session, sensor_id: str):
    return db.execute(select(Sensor, Zone).join(Zone, Sensor.zone_id == Zone.id).where(Sensor.id == sensor_id)).first()
