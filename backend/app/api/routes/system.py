from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.core.config import Settings, get_settings
from app.db.session import get_engine
from app.schemas.system import DatabaseHealth, HealthOut, RootOut

router = APIRouter(tags=["System"])


def database_status(settings: Settings) -> str:
    if not settings.database_url:
        return "not_configured"
    try:
        with get_engine(settings).connect() as conn:
            conn.execute(text("SELECT 1"))
        return "ok"
    except Exception:  # any connection problem means "unreachable"; details stay out of the response
        return "unreachable"


@router.get("/", response_model=RootOut, summary="API status and project information")
def root(settings: Settings = Depends(get_settings)):
    return RootOut(
        name=settings.project_name, version=settings.version,
        description="SmartTwin Cloud: Tamil Nadu Smart City Digital Twin (college project backend).",
        data_notice="All sensor readings and alerts are SIMULATED sample data. They are not real or official measurements.",
        docs_url="/docs", health_url="/health")


@router.get("/health", response_model=HealthOut, summary="Health check")
def health(settings: Settings = Depends(get_settings)):
    db = database_status(settings)
    return HealthOut(status="ok" if db == "ok" else "degraded", service=settings.project_name, version=settings.version,
                     environment=settings.environment, time=datetime.now(timezone.utc), database=DatabaseHealth(status=db))
