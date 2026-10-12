from pydantic import BaseModel, Field


class ZoneOut(BaseModel):
    id: str
    city_id: str
    name: str
    category: str
    sort_order: int
    meta: dict = Field(default_factory=dict)
    sensor_count: int = 0
