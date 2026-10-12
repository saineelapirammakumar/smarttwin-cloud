"""SQLAlchemy base class. The naming convention gives every constraint a predictable name (helps Alembic)."""
from sqlalchemy import JSON, MetaData
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}
JSONType = JSON().with_variant(JSONB(), "postgresql")  # JSONB on PostgreSQL


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
