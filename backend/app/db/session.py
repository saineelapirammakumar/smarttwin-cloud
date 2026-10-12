"""Database connection. The engine is created lazily, so the API can start before PostgreSQL is configured."""
from collections.abc import Iterator
from functools import lru_cache

from fastapi import Depends
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings


class DatabaseNotConfiguredError(Exception):
    """Raised when DATABASE_URL is missing."""


@lru_cache
def _engine_for(url: str) -> Engine:
    # pool_pre_ping drops dead connections; connect_timeout stops requests hanging if PostgreSQL is down.
    return create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 3})


def get_engine(settings: Settings) -> Engine:
    if not settings.database_url:
        raise DatabaseNotConfiguredError("DATABASE_URL is not set")
    return _engine_for(settings.database_url)


def get_db(settings: Settings = Depends(get_settings)) -> Iterator[Session]:
    """FastAPI dependency: one database session per request."""
    with Session(get_engine(settings)) as session:
        yield session
