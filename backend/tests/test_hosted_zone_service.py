import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session as DatabaseSession

from app.core.exceptions import APIError
from app.models.dns_record import DNSRecord
from app.models.enums import HostedZoneType
from app.models.hosted_zone import HostedZone
from app.models.user import User
from app.services.hosted_zone import HostedZoneService


def create_user(db: DatabaseSession) -> User:
    user = User(
        name="Service Test User",
        email="service@example.com",
        password_hash="not-used",
    )
    db.add(user)
    db.commit()
    return user


def test_public_zone_and_system_records_roll_back_atomically(
    db_session: DatabaseSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = create_user(db_session)
    service = HostedZoneService(db_session)

    def fail_system_records(records: object) -> None:
        raise SQLAlchemyError("forced system-record failure")

    monkeypatch.setattr(service._records, "create_many", fail_system_records)

    with pytest.raises(APIError) as exc_info:
        service.create(
            user=user,
            name="rollback.example",
            comment=None,
            zone_type=HostedZoneType.PUBLIC,
        )

    assert exc_info.value.code == "HOSTED_ZONE_CREATION_FAILED"
    assert db_session.scalar(select(func.count()).select_from(HostedZone)) == 0
    assert db_session.scalar(select(func.count()).select_from(DNSRecord)) == 0


def test_database_uniqueness_race_returns_safe_conflict(
    db_session: DatabaseSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = create_user(db_session)
    existing = HostedZone(
        user_id=user.id,
        name="conflict.example.",
        comment=None,
        zone_type=HostedZoneType.PRIVATE,
    )
    db_session.add(existing)
    db_session.commit()
    service = HostedZoneService(db_session)
    monkeypatch.setattr(
        service._zones,
        "get_owned_by_name_and_type",
        lambda **_: None,
    )

    with pytest.raises(APIError) as exc_info:
        service.create(
            user=user,
            name="conflict.example",
            comment=None,
            zone_type=HostedZoneType.PRIVATE,
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.code == "HOSTED_ZONE_ALREADY_EXISTS"
    assert (
        db_session.scalar(select(func.count()).select_from(HostedZone)) == 1
    )
