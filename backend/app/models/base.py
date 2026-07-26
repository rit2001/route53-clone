from datetime import datetime, timezone
from secrets import choice
from string import ascii_uppercase, digits
from typing import Any
from uuid import uuid4

from sqlalchemy import DateTime, MetaData
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator

UUID_STRING_LENGTH = 36
HOSTED_ZONE_ID_PREFIX = "Z"
HOSTED_ZONE_ID_RANDOM_LENGTH = 20
HOSTED_ZONE_ID_LENGTH = len(HOSTED_ZONE_ID_PREFIX) + HOSTED_ZONE_ID_RANDOM_LENGTH
HOSTED_ZONE_ID_ALPHABET = ascii_uppercase + digits

NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


def generate_uuid() -> str:
    return str(uuid4())


def generate_hosted_zone_id() -> str:
    """Generate an original Route53-inspired identifier, not an AWS ID."""
    suffix = "".join(
        choice(HOSTED_ZONE_ID_ALPHABET)
        for _ in range(HOSTED_ZONE_ID_RANDOM_LENGTH)
    )
    return f"{HOSTED_ZONE_ID_PREFIX}{suffix}"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator[datetime]):
    """Keep Python datetimes UTC-aware even when SQLite returns naive values."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(
        self,
        value: datetime | None,
        dialect: Any,
    ) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("UTCDateTime requires a timezone-aware value")
        return value.astimezone(timezone.utc)

    def process_result_value(
        self,
        value: datetime | None,
        dialect: Any,
    ) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        default=utc_now,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
