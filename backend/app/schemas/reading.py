from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.alert import AlertOut
from app.schemas.sensor import DataSource, SensorType


class ReadingCreate(BaseModel):
    value: float = Field(allow_inf_nan=False, description="Measured value in the sensor's unit")
    recorded_at: datetime | None = Field(None, description="ISO 8601 time; defaults to now")
    data_source: DataSource = "simulated"
    meta: dict | None = None


class ReadingOut(BaseModel):
    id: int
    sensor_id: str
    zone_id: str
    city_id: str
    metric: SensorType
    value: float
    unit: str
    recorded_at: datetime
    data_source: DataSource


class ReadingCreated(BaseModel):
    reading: ReadingOut
    alert_action: str | None = None  # created | escalated | resolved
    alert: AlertOut | None = None


class LatestReadingOut(BaseModel):
    sensor_id: str
    zone_id: str
    city_id: str
    metric: SensorType
    value: float
    unit: str
    recorded_at: datetime
    sensor_status: str
    data_source: DataSource


class SeriesOut(BaseModel):
    zone_id: str
    metric: SensorType
    points: list[list[float]]  # [[epoch_milliseconds, average_value], ...]


class TimeseriesOut(BaseModel):
    bucket_seconds: int
    start: datetime
    end: datetime
    series: list[SeriesOut]
