import re
from datetime import timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session as DatabaseSession

from app.models import (
    DNSRecord,
    DNSRecordType,
    HostedZone,
    HostedZoneType,
    RoutingPolicy,
    Session,
    User,
)
from app.models.base import (
    HOSTED_ZONE_ID_LENGTH,
    generate_hosted_zone_id,
    utc_now,
)

HOSTED_ZONE_ID_PATTERN = re.compile(r"^Z[A-Z0-9]{20}$")


def build_user(email: str = "operator@example.com") -> User:
    return User(
        name="Route53 Operator",
        email=email,
        password_hash="hashed-password-placeholder",
    )


def build_zone(
    user: User,
    *,
    name: str = "example.com.",
    zone_type: HostedZoneType = HostedZoneType.PUBLIC,
) -> HostedZone:
    return HostedZone(
        user=user,
        name=name,
        comment="Persistence test zone",
        zone_type=zone_type,
    )


def build_record(
    zone: HostedZone,
    *,
    name: str = "www.example.com.",
    record_type: DNSRecordType = DNSRecordType.A,
    values: list[str] | None = None,
) -> DNSRecord:
    return DNSRecord(
        hosted_zone=zone,
        name=name,
        record_type=record_type,
        values=values or ["192.0.2.10"],
        ttl=300,
    )


def test_uuid_identifiers_are_generated_on_flush(
    db_session: DatabaseSession,
) -> None:
    user = build_user()
    auth_session = Session(
        user=user,
        token_hash="a" * 64,
        expires_at=utc_now() + timedelta(hours=24),
    )
    zone = build_zone(user)
    record = build_record(zone)
    db_session.add(user)
    db_session.flush()

    for identifier in (user.id, auth_session.id, record.id):
        parsed = UUID(identifier)
        assert parsed.version == 4
        assert str(parsed) == identifier


def test_hosted_zone_identifier_generator_has_stable_original_format() -> None:
    identifiers = {generate_hosted_zone_id() for _ in range(100)}

    assert len(identifiers) == 100
    assert all(len(identifier) == HOSTED_ZONE_ID_LENGTH for identifier in identifiers)
    assert all(
        HOSTED_ZONE_ID_PATTERN.fullmatch(identifier)
        for identifier in identifiers
    )


def test_hosted_zone_identifier_is_generated_on_flush(
    db_session: DatabaseSession,
) -> None:
    zone = build_zone(build_user())
    db_session.add(zone)
    db_session.flush()

    assert HOSTED_ZONE_ID_PATTERN.fullmatch(zone.id)


def test_json_values_and_defaults_round_trip_through_sqlite(
    db_session: DatabaseSession,
) -> None:
    expected_values = [
        "10 mail1.example.com.",
        "20 mail2.example.com.",
    ]
    record = build_record(
        build_zone(build_user()),
        name="example.com.",
        record_type=DNSRecordType.MX,
        values=expected_values,
    )
    db_session.add(record)
    db_session.commit()
    record_id = record.id
    db_session.expunge_all()

    loaded = db_session.get(DNSRecord, record_id)

    assert loaded is not None
    assert loaded.values == expected_values
    assert isinstance(loaded.values, list)
    assert all(isinstance(value, str) for value in loaded.values)
    assert loaded.routing_policy is RoutingPolicy.SIMPLE
    assert loaded.alias is False
    assert loaded.is_system is False


def test_mutating_json_values_is_persisted(
    db_session: DatabaseSession,
) -> None:
    record = build_record(build_zone(build_user()))
    db_session.add(record)
    db_session.commit()
    record_id = record.id

    record.values.append("192.0.2.11")
    db_session.commit()
    db_session.expunge_all()

    loaded = db_session.get(DNSRecord, record_id)
    assert loaded is not None
    assert loaded.values == ["192.0.2.10", "192.0.2.11"]


def test_enum_values_persist_and_load(
    db_session: DatabaseSession,
) -> None:
    user = build_user()
    private_zone = build_zone(user, zone_type=HostedZoneType.PRIVATE)
    system_record = build_record(
        private_zone,
        name="example.com.",
        record_type=DNSRecordType.SOA,
        values=["ns1.example.com. hostmaster.example.com. 1 7200 900 1209600 86400"],
    )
    system_record.is_system = True
    db_session.add(user)
    db_session.commit()
    zone_id = private_zone.id
    record_id = system_record.id
    db_session.expunge_all()

    loaded_zone = db_session.get(HostedZone, zone_id)
    loaded_record = db_session.get(DNSRecord, record_id)

    assert loaded_zone is not None
    assert loaded_zone.zone_type is HostedZoneType.PRIVATE
    assert loaded_record is not None
    assert loaded_record.record_type is DNSRecordType.SOA
    assert loaded_record.routing_policy is RoutingPolicy.SIMPLE


def test_public_and_private_zone_names_can_coexist(
    db_session: DatabaseSession,
) -> None:
    user = build_user()
    public_zone = build_zone(user, zone_type=HostedZoneType.PUBLIC)
    private_zone = build_zone(user, zone_type=HostedZoneType.PRIVATE)
    db_session.add_all([public_zone, private_zone])
    db_session.commit()

    zones = db_session.scalars(
        select(HostedZone).order_by(HostedZone.zone_type)
    ).all()
    assert {zone.zone_type for zone in zones} == {
        HostedZoneType.PUBLIC,
        HostedZoneType.PRIVATE,
    }


def test_timestamps_are_utc_aware_and_updated_on_change(
    db_session: DatabaseSession,
) -> None:
    user = build_user()
    zone = build_zone(user)
    record = build_record(zone)
    auth_session = Session(
        user=user,
        token_hash="b" * 64,
        expires_at=utc_now() + timedelta(hours=24),
    )
    db_session.add(user)
    db_session.commit()

    timestamps = [
        user.created_at,
        user.updated_at,
        zone.created_at,
        zone.updated_at,
        record.created_at,
        record.updated_at,
        auth_session.created_at,
        auth_session.expires_at,
    ]
    assert all(value.utcoffset() == timedelta(0) for value in timestamps)

    previous_updated_at = user.updated_at
    user.name = "Updated Operator"
    db_session.commit()

    assert user.updated_at > previous_updated_at
