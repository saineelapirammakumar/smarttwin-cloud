from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

SENSOR_TYPES = ("traffic", "aqi", "temperature", "humidity", "energy")
SENSOR_STATUSES = ("active", "faulty", "offline")


class Sensor(Base):
    """One sensor measures ONE metric (so each reading is a single value)."""

    __tablename__ = "sensors"
    __table_args__ = (
        CheckConstraint("sensor_type IN ('traffic','aqi','temperature','humidity','energy')", name="sensor_type_valid"),
        CheckConstraint("status IN ('active','faulty','offline')", name="status_valid"),
        CheckConstraint("data_source IN ('simulated','real')", name="data_source_valid"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # e.g. 'CHENNAI-PERAMBUR-AQI-01'
    zone_id: Mapped[str] = mapped_column(ForeignKey("zones.id", ondelete="CASCADE"), index=True)
    sensor_type: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(120))
    unit: Mapped[str] = mapped_column(String(16))  # %, AQI, °C, kW
    status: Mapped[str] = mapped_column(String(16), default="active", server_default="active")
    data_source: Mapped[str] = mapped_column(String(16), default="simulated", server_default="simulated")
    last_value: Mapped[float | None] = mapped_column(Float, nullable=True)  # latest reading (fast dashboard queries)
    last_reading_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    zone: Mapped["Zone"] = relationship(back_populates="sensors")
    readings: Mapped[list["SensorReading"]] = relationship(back_populates="sensor", cascade="all, delete-orphan")
