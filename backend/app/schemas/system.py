from datetime import datetime

from pydantic import BaseModel


class RootOut(BaseModel):
    name: str
    version: str
    description: str
    data_notice: str
    docs_url: str
    health_url: str


class DatabaseHealth(BaseModel):
    status: str  # ok | not_configured | unreachable


class HealthOut(BaseModel):
    status: str  # ok | degraded
    service: str
    version: str
    environment: str
    time: datetime
    database: DatabaseHealth
