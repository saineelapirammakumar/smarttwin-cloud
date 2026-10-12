from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_city_or_404
from app.db.session import get_db
from app.schemas.city import CityOut
from app.schemas.dashboard import CityMetricsOut
from app.schemas.zone import ZoneOut
from app.services import dashboard as dashboard_service
from app.services import cities as city_service
from app.services import zones as zone_service

router = APIRouter(prefix="/cities", tags=["Cities"])


@router.get("", response_model=list[CityOut], summary="List supported Tamil Nadu cities")
def list_cities():
    return city_service.list_cities()


# Parameter order matters: the city check runs first (404) before the database is touched.
@router.get("/{city_id}/zones", response_model=list[ZoneOut], summary="List monitoring zones of a city")
def list_city_zones(city: dict = Depends(get_city_or_404), db: Session = Depends(get_db)):
    return zone_service.list_zones_for_city(db, city["id"])


@router.get("/{city_id}/metrics", response_model=CityMetricsOut, summary="Dashboard metrics for one city")
def city_metrics(city: dict = Depends(get_city_or_404), db: Session = Depends(get_db)):
    return dashboard_service.city_metrics(db, city)
