from datetime import datetime

from sqlalchemy import DateTime, Integer, String, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, JSONType


class Zone(Base):
    """A monitoring zone inside a city (illustrative area, not an official boundary)."""

    __tablename__ = "zones"
    __table_args__ = (UniqueConstraint("city_id", "name", name="uq_zones_city_name"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # e.g. 'chennai-perambur' (same as frontend)
    city_id: Mapped[str] = mapped_column(String(32), index=True)  # e.g. 'chennai' (cities live in app/data/catalog.py)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(40))  # Residential, Transit, Industrial, ...
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    meta: Mapped[dict] = mapped_column(JSONType, default=dict, server_default=text("'{}'"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sensors: Mapped[list["Sensor"]] = relationship(back_populates="zone", cascade="all, delete-orphan")
