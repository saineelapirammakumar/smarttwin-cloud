"""Import every model so SQLAlchemy and Alembic know about all tables."""
from app.models.alert import Alert
from app.models.reading import SensorReading
from app.models.sensor import Sensor
from app.models.zone import Zone

__all__ = ["Alert", "Sensor", "SensorReading", "Zone"]
