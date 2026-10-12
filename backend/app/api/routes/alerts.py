from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_city_or_404
from app.db.session import get_db
from app.schemas.alert import AlertOut, AlertStatus, AlertUpdate, Severity
from app.services import alerts as svc

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=list[AlertOut], summary="List alerts, newest first")
def list_alerts(city_id: str | None = None, zone_id: str | None = None, sensor_id: str | None = None, severity: Severity | None = None,
                status: AlertStatus | None = None, limit: int = Query(100, ge=1, le=1000), offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    if city_id:
        get_city_or_404(city_id)
    return svc.list_alerts(db, city_id, zone_id, sensor_id, severity, status, limit, offset)


@router.get("/{alert_id}", response_model=AlertOut, summary="Get one alert")
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = svc.get_alert(db, alert_id)
    if alert is None:
        raise HTTPException(404, f"Alert {alert_id} not found.")
    return alert


@router.patch("/{alert_id}", response_model=AlertOut, summary="Acknowledge or resolve an alert")
def update_alert(alert_id: int, body: AlertUpdate, db: Session = Depends(get_db)):
    return svc.change_status(db, alert_id, body.status, body.note)
