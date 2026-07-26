import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session as DatabaseSession

from app.core.exceptions import APIError
from app.models.dns_record import DNSRecord
from app.models.enums import DNSRecordType, HostedZoneType, RoutingPolicy
from app.models.hosted_zone import HostedZone
from app.models.user import User
from app.services.dns_record import DNSRecordService


def create_user_and_zone(
    db: DatabaseSession,
) -> tuple[User, HostedZone]:
    user = User(
        name="Record Service User",
        email="record-service@example.com",
        password_hash="not-used",
    )
    zone = HostedZone(
        user=user,
        name="example.com.",
        zone_type=HostedZoneType.PRIVATE,
    )
    db.add(user)
    db.commit()
    return user, zone


def test_injected_record_creation_failure_rolls_back(
    db_session: DatabaseSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user, zone = create_user_and_zone(db_session)
    service = DNSRecordService(db_session)

    def fail_create(**_: object) -> DNSRecord:
        raise SQLAlchemyError("forced record creation failure")

    monkeypatch.setattr(service._records, "create", fail_create)

    with pytest.raises(APIError) as exc_info:
        service.create(
            user=user,
            zone_id=zone.id,
            name="api",
            record_type=DNSRecordType.A,
            values=["192.0.2.1"],
            ttl=300,
            routing_policy=RoutingPolicy.SIMPLE,
            alias=False,
        )

    assert exc_info.value.code == "DNS_RECORD_CREATION_FAILED"
    assert db_session.scalar(select(func.count()).select_from(DNSRecord)) == 0


def test_record_uniqueness_race_returns_safe_conflict(
    db_session: DatabaseSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user, zone = create_user_and_zone(db_session)
    existing = DNSRecord(
        hosted_zone_id=zone.id,
        name="api.example.com.",
        record_type=DNSRecordType.A,
        values=["192.0.2.1"],
        ttl=300,
    )
    db_session.add(existing)
    db_session.commit()
    service = DNSRecordService(db_session)
    monkeypatch.setattr(
        service._records,
        "get_all_at_name",
        lambda **_: [],
    )

    with pytest.raises(APIError) as exc_info:
        service.create(
            user=user,
            zone_id=zone.id,
            name="api",
            record_type=DNSRecordType.A,
            values=["192.0.2.2"],
            ttl=300,
            routing_policy=RoutingPolicy.SIMPLE,
            alias=False,
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.code == "DNS_RECORD_ALREADY_EXISTS"
    assert db_session.scalar(select(func.count()).select_from(DNSRecord)) == 1
