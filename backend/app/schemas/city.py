from pydantic import BaseModel


class CityOut(BaseModel):
    id: str
    name: str
    short_name: str | None = None
    region: str
    latitude: float
    longitude: float
