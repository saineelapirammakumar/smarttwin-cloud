from datetime import datetime
from typing import Literal

from pydantic import BaseModel

SensorType = Literal["traffic", "aqi", "temperature", "humidity", "energy"]
SensorStatus = Literal["active", "faulty", "offline"]
DataSource = Literal["simulated", "real"]


class SensorOut(BaseModel):
    id: str
    zone_id: str
    zone_name: str
    city_id: str
    sensor_type: SensorType
    name: str
    unit: str
    status: SensorStatus
    data_source: DataSource
    last_value: float | None = None
    last_reading_at: datetime | None = None
    created_at: datetime
