from fastapi import APIRouter

from app.api.routes import alerts, cities, readings, sensors, thresholds, zones

api_router = APIRouter(prefix="/api")
for r in (cities, zones, sensors, readings, alerts, thresholds):
    api_router.include_router(r.router)
