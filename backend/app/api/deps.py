from fastapi import HTTPException

from app.services.cities import get_city


def get_city_or_404(city_id: str) -> dict:
    city = get_city(city_id)
    if city is None:
        raise HTTPException(status_code=404, detail=f"City '{city_id}' not found. See GET /api/cities for valid IDs.")
    return city


from fastapi import Depends  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.db.session import get_db  # noqa: E402
from app.services import sensors as sensor_service  # noqa: E402


def get_sensor_or_404(sensor_id: str, db: Session = Depends(get_db)):
    row = sensor_service.get_sensor(db, sensor_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Sensor '{sensor_id}' not found.")
    return row  # (Sensor, Zone)
