from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, Float, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, JSONType


class SensorReading(Base):
    """One measured value from one sensor at one time. data_source says whether it is simulated."""

    __tablename__ = "sensor_readings"
    __table_args__ = (
        Index("ix_sensor_readings_sensor_time", "sensor_id", "recorded_at"),  # fast history queries
        Index("ix_sensor_readings_recorded_at", "recorded_at"),
        CheckConstraint("data_source IN ('simulated','real')", name="data_source_valid"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sensor_id: Mapped[str] = mapped_column(ForeignKey("sensors.id", ondelete="CASCADE"))
    value: Mapped[float] = mapped_column(Float)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    data_source: Mapped[str] = mapped_column(String(16), default="simulated", server_default="simulated")
    meta: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sensor: Mapped["Sensor"] = relationship(back_populates="readings")
