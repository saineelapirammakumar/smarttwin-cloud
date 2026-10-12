from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.sensor import DataSource, SensorType

AlertStatus = Literal["open", "acknowledged", "resolved"]
Severity = Literal["warning", "critical"]


class AlertOut(BaseModel):
    id: int
    sensor_id: str
    zone_id: str
    zone_name: str
    city_id: str
    metric: SensorType
    unit: str
    alert_type: str
    severity: Severity
    status: AlertStatus
    message: str
    value: float
    threshold: float
    data_source: DataSource
    triggered_at: datetime
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None
    resolution_note: str | None = None


class AlertUpdate(BaseModel):
    status: Literal["acknowledged", "resolved"]
    note: str | None = Field(None, max_length=500, description="Optional note, saved when resolving")
