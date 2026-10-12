"""Test setup. Database tests need PostgreSQL: set TEST_DATABASE_URL to a SEPARATE database whose name contains
'test' (for example .../smarttwin_test). Without it those tests are SKIPPED. Your development database is never touched."""
import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.seed import seed_catalog
from app.db.session import get_db
from app.main import app

BACKEND = Path(__file__).resolve().parents[1]
try:  # TEST_DATABASE_URL may be set in the environment or in backend/.env
    from dotenv import dotenv_values
    TEST_URL = os.environ.get("TEST_DATABASE_URL") or dotenv_values(BACKEND / ".env").get("TEST_DATABASE_URL")
except ImportError:
    TEST_URL = os.environ.get("TEST_DATABASE_URL")


@pytest.fixture
def client_nodb():
    """Client with NO database configured (ignores any local .env)."""
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None, database_url=None)
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def pg_engine():
    if not TEST_URL:
        pytest.skip("TEST_DATABASE_URL is not set: PostgreSQL tests skipped (see README)")
    name = make_url(TEST_URL).database or ""
    assert "test" in name, f"Refusing to run: '{name}' does not look like a test database"
    engine = create_engine(TEST_URL)
    with engine.begin() as c:  # fresh schema in the TEST database only
        c.execute(text("DROP SCHEMA public CASCADE"))
        c.execute(text("CREATE SCHEMA public"))
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.attributes["url"] = TEST_URL
    command.upgrade(cfg, "head")  # also tests the migration itself
    with Session(engine) as db:
        seed_catalog(db)
    yield engine
    engine.dispose()


@pytest.fixture
def db(pg_engine):
    with pg_engine.begin() as c:  # clean slate for every test (zones and sensors stay)
        c.execute(text("TRUNCATE alerts, sensor_readings RESTART IDENTITY"))
        c.execute(text("UPDATE sensors SET last_value = NULL, last_reading_at = NULL"))
    with Session(pg_engine) as session:
        yield session


def _client(pg_engine, cooldown):
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None, database_url=TEST_URL, alert_cooldown_seconds=cooldown)

    def override_db():
        with Session(pg_engine) as s:
            yield s

    app.dependency_overrides[get_db] = override_db
    return TestClient(app)


@pytest.fixture
def client(pg_engine, db):
    """API client wired to the test database (alert cooldown 300 s)."""
    with _client(pg_engine, 300) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def client_nocooldown(pg_engine, db):
    with _client(pg_engine, 0) as c:
        yield c
    app.dependency_overrides.clear()
