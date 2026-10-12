from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Alert, Sensor, Zone
from app.schemas.alert import AlertOut


def to_out(a: Alert, sensor_type: str, unit: str, zone_name: str, city_id: str) -> AlertOut:
    return AlertOut(id=a.id, sensor_id=a.sensor_id, zone_id=a.zone_id, zone_name=zone_name, city_id=city_id, metric=sensor_type, unit=unit,
                    alert_type=a.alert_type, severity=a.severity, status=a.status, message=a.message, value=a.value, threshold=a.threshold,
                    data_source=a.data_source, triggered_at=a.triggered_at, acknowledged_at=a.acknowledged_at, resolved_at=a.resolved_at,
                    resolution_note=a.resolution_note)


def _base():
    return select(Alert, Sensor.sensor_type, Sensor.unit, Zone.name, Zone.city_id).join(Sensor, Alert.sensor_id == Sensor.id).join(Zone, Alert.zone_id == Zone.id)


def list_alerts(db: Session, city_id=None, zone_id=None, sensor_id=None, severity=None, status=None, limit=100, offset=0) -> list[AlertOut]:
    q = _base()
    for col, val in ((Zone.city_id, city_id), (Alert.zone_id, zone_id), (Alert.sensor_id, sensor_id), (Alert.severity, severity), (Alert.status, status)):
        if val:
            q = q.where(col == val)
    rows = db.execute(q.order_by(Alert.triggered_at.desc(), Alert.id.desc()).limit(limit).offset(offset)).all()
    return [to_out(*r) for r in rows]


def get_alert(db: Session, alert_id: int) -> AlertOut | None:
    row = db.execute(_base().where(Alert.id == alert_id)).first()
    return to_out(*row) if row else None


def change_status(db: Session, alert_id: int, new_status: str, note: str | None) -> AlertOut:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(404, f"Alert {alert_id} not found.")
    now = datetime.now(timezone.utc)
    if alert.status == "resolved":
        raise HTTPException(409, "This alert is already resolved and cannot be changed.")
    if new_status == "acknowledged":
        if alert.status != "open":
            raise HTTPException(409, "Only an open alert can be acknowledged.")
        alert.status, alert.acknowledged_at = "acknowledged", now
    else:
        alert.status, alert.resolved_at, alert.resolution_note = "resolved", now, note or "Resolved manually."
    db.commit()
    return get_alert(db, alert_id)
