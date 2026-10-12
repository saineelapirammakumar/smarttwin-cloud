"""Checks the table design WITHOUT a database: structure plus the SQL PostgreSQL would receive (compile only)."""
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateIndex, CreateTable

import app.models  # noqa: F401  (registers all models)
from app.db.base import Base


def test_the_four_required_tables_exist():
    assert set(Base.metadata.tables) == {"zones", "sensors", "sensor_readings", "alerts"}


def test_foreign_keys_link_tables():
    t = Base.metadata.tables
    assert {fk.target_fullname for fk in t["sensors"].foreign_keys} == {"zones.id"}
    assert {fk.target_fullname for fk in t["sensor_readings"].foreign_keys} == {"sensors.id"}
    assert {fk.target_fullname for fk in t["alerts"].foreign_keys} == {"sensors.id", "zones.id"}


def test_check_constraints_compile_for_postgresql():
    ddl = str(CreateTable(Base.metadata.tables["alerts"]).compile(dialect=postgresql.dialect()))
    assert "status IN ('open','acknowledged','resolved')" in ddl and "JSONB" not in ddl
    assert "JSONB" in str(CreateTable(Base.metadata.tables["zones"]).compile(dialect=postgresql.dialect()))


def test_alert_dedup_partial_unique_index():
    idx = next(i for i in Base.metadata.tables["alerts"].indexes if i.name == "uq_alerts_one_active_per_sensor_type")
    sql = str(CreateIndex(idx).compile(dialect=postgresql.dialect()))
    assert "UNIQUE" in sql and "WHERE status IN ('open','acknowledged')" in sql
