from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, Float, ForeignKey, Index, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

ALERT_SEVERITIES = ("warning", "critical")
ALERT_STATUSES = ("open", "acknowledged", "resolved")


class Alert(Base):
    """A threshold alert. The partial unique index allows only ONE active (open/acknowledged) alert per
    sensor and alert type, which is the database-level safety net for alert de-duplication."""

    __tablename__ = "alerts"
    __table_args__ = (
        CheckConstraint("severity IN ('warning','critical')", name="severity_valid"),
        CheckConstraint("status IN ('open','acknowledged','resolved')", name="status_valid"),
        CheckConstraint("data_source IN ('simulated','real')", name="data_source_valid"),
        Index("uq_alerts_one_active_per_sensor_type", "sensor_id", "alert_type", unique=True,
              postgresql_where=text("status IN ('open','acknowledged')")),
        Index("ix_alerts_status_triggered", "status", "triggered_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sensor_id: Mapped[str] = mapped_column(ForeignKey("sensors.id", ondelete="CASCADE"), index=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("zones.id", ondelete="CASCADE"), index=True)
    alert_type: Mapped[str] = mapped_column(String(40))  # high_aqi, high_congestion, high_temperature, high_energy
    severity: Mapped[str] = mapped_column(String(16))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="open", server_default="open")
    value: Mapped[float] = mapped_column(Float)  # the reading that triggered it
    threshold: Mapped[float] = mapped_column(Float)  # the limit that was crossed
    data_source: Mapped[str] = mapped_column(String(16), default="simulated", server_default="simulated")
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
