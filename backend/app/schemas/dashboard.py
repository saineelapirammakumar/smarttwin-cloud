from datetime import datetime

from pydantic import BaseModel

from app.schemas.city import CityOut


class MetricSummary(BaseModel):
    value: float | None
    unit: str
    status: str  # normal | warning | critical | no_data


class ZoneMetrics(BaseModel):
    zone_id: str
    name: str
    category: str
    status: str
    metrics: dict[str, MetricSummary]


class SensorCounts(BaseModel):
    total: int
    active: int
    faulty: int
    offline: int


class AlertCounts(BaseModel):
    open: int
    acknowledged: int
    resolved: int
    active_critical: int


class CityMetricsOut(BaseModel):
    city: CityOut
    generated_at: datetime
    data_source: str
    metrics: dict[str, MetricSummary]  # traffic/aqi/temperature = average, energy = total kW
    zones: list[ZoneMetrics]
    sensors: SensorCounts
    alerts: AlertCounts
