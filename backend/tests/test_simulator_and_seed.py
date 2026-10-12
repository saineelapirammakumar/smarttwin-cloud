"""Seed, simulator and migration tests against the PostgreSQL test database."""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import func, select, text

import simulator
from app.core.config import get_settings
from app.db.seed import seed_catalog
from app.models import Sensor, SensorReading, Zone
from app.services.ingest import NewReading, ingest
from app.services.simulation import backfill, prune_old_readings, run_tick

from tests.conftest import TEST_URL


def test_migration_created_tables_and_partial_unique_index(pg_engine):
    with pg_engine.connect() as c:
        tables = {r[0] for r in c.execute(text("select tablename from pg_tables where schemaname='public'"))}
        idx = c.execute(text("select indexdef from pg_indexes where indexname='uq_alerts_one_active_per_sensor_type'")).scalar()
    assert {"zones", "sensors", "sensor_readings", "alerts", "alembic_version"} <= tables
    assert "UNIQUE" in idx and "open" in idx


def test_seed_is_idempotent_and_complete(db):
    again = seed_catalog(db)
    assert again == {"zones_added": 0, "sensors_added": 0}
    assert db.scalar(select(func.count()).select_from(Zone)) == 72 and db.scalar(select(func.count()).select_from(Sensor)) == 360
    per_city = dict(db.execute(select(Zone.city_id, func.count()).group_by(Zone.city_id)).all())
    assert len(per_city) == 12 and set(per_city.values()) == {6}
    assert {s for (s,) in db.execute(select(Sensor.data_source).distinct())} == {"simulated"}


def test_tick_stores_one_simulated_reading_per_reporting_sensor(db):
    reporting = db.scalar(select(func.count()).select_from(Sensor).where(Sensor.status != "offline"))
    assert run_tick(db)["readings"] == reporting
    assert db.scalar(select(func.count()).select_from(SensorReading)) == reporting
    assert {s for (s,) in db.execute(select(SensorReading.data_source).distinct())} == {"simulated"}
    run_tick(db)
    assert db.scalar(select(func.count()).select_from(SensorReading)) == 2 * reporting
    assert db.scalar(select(func.count()).select_from(Sensor).where(Sensor.status != "offline", Sensor.last_value.is_(None))) == 0


def test_tick_can_be_limited_to_one_city(db):
    n = run_tick(db, cities=["hosur"])["readings"]
    assert 0 < n <= 30


def test_backfill_creates_chronological_labelled_history(db):
    result = backfill(db, days=1)
    assert result["readings"] > 20000
    times = [t for (t,) in db.execute(select(SensorReading.recorded_at).where(SensorReading.sensor_id == "CHENNAI-PERAMBUR-AQI-01").order_by(SensorReading.recorded_at))]
    assert times == sorted(times) and len(times) > 70


def test_prune_removes_only_old_readings(db):
    sensor = db.get(Sensor, "CHENNAI-PERAMBUR-AQI-01")
    now = datetime.now(timezone.utc)
    ingest(db, [NewReading(sensor, 50, now - timedelta(days=10)), NewReading(sensor, 55, now - timedelta(hours=1))])
    db.commit()
    assert prune_old_readings(db, retention_days=7) == 1
    assert db.scalar(select(func.count()).select_from(SensorReading)) == 1


def test_only_one_simulator_can_run(pg_engine, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", TEST_URL)
    get_settings.cache_clear()
    try:
        first = simulator.acquire_lock(pg_engine)
        assert first is not None
        assert simulator.acquire_lock(pg_engine) is None
        assert simulator.main(["--once"]) == 3  # refuses to start a duplicate
        first.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": simulator.LOCK_KEY})  # release (a pooled connection keeps it otherwise)
        first.close()
        assert simulator.main(["--once", "--city", "hosur"]) == 0  # lock released, runs normally
    finally:
        get_settings.cache_clear()


def test_simulator_rejects_bad_interval(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", TEST_URL or "postgresql+psycopg://u:p@localhost/x")
    get_settings.cache_clear()
    try:
        assert simulator.main(["--interval", "0"]) == 2
    finally:
        get_settings.cache_clear()
