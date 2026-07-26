from datetime import timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session as DatabaseSession

from app.models import (
    DNSRecord,
    DNSRecordType,
    HostedZone,
    HostedZoneType,
    Session,
    User,
)
from app.models.base import utc_now


def add_owned_graph(
    db_session: DatabaseSession,
    *,
    email: str,
    domain: str,
) -> tuple[User, Session, HostedZone, DNSRecord]:
    user = User(
        name="Cascade Test User",
        email=email,
        password_hash="hashed-password-placeholder",
    )
    auth_session = Session(
        user=user,
        token_hash=f"token-hash-for-{email}",
        expires_at=utc_now() + timedelta(hours=24),
    )
    zone = HostedZone(
        user=user,
        name=domain,
        zone_type=HostedZoneType.PUBLIC,
    )
    record = DNSRecord(
        hosted_zone=zone,
        name=domain,
        record_type=DNSRecordType.A,
        values=["192.0.2.10"],
        ttl=300,
    )
    db_session.add(user)
    return user, auth_session, zone, record


def row_count(db_session: DatabaseSession, model: type) -> int:
    return db_session.scalar(select(func.count()).select_from(model)) or 0


def test_database_user_delete_cascades_and_preserves_other_owner(
    db_session: DatabaseSession,
) -> None:
    first = add_owned_graph(
        db_session,
        email="first@example.com",
        domain="first.example.",
    )
    second = add_owned_graph(
        db_session,
        email="second@example.com",
        domain="second.example.",
    )
    db_session.commit()

    db_session.execute(delete(User).where(User.id == first[0].id))
    db_session.commit()

    assert row_count(db_session, User) == 1
    assert row_count(db_session, Session) == 1
    assert row_count(db_session, HostedZone) == 1
    assert row_count(db_session, DNSRecord) == 1
    assert db_session.get(User, second[0].id) is not None
    assert db_session.get(Session, second[1].id) is not None
    assert db_session.get(HostedZone, second[2].id) is not None
    assert db_session.get(DNSRecord, second[3].id) is not None


def test_orm_hosted_zone_delete_cascades_to_records_only(
    db_session: DatabaseSession,
) -> None:
    user = User(
        name="Zone Cascade User",
        email="zone-cascade@example.com",
        password_hash="hashed-password-placeholder",
    )
    first_zone = HostedZone(
        user=user,
        name="first.example.",
        zone_type=HostedZoneType.PUBLIC,
    )
    second_zone = HostedZone(
        user=user,
        name="second.example.",
        zone_type=HostedZoneType.PUBLIC,
    )
    first_record = DNSRecord(
        hosted_zone=first_zone,
        name="first.example.",
        record_type=DNSRecordType.A,
        values=["192.0.2.10"],
        ttl=300,
    )
    second_record = DNSRecord(
        hosted_zone=second_zone,
        name="second.example.",
        record_type=DNSRecordType.A,
        values=["192.0.2.11"],
        ttl=300,
    )
    db_session.add(user)
    db_session.commit()
    first_record_id = first_record.id
    second_record_id = second_record.id

    db_session.delete(first_zone)
    db_session.commit()

    assert db_session.get(DNSRecord, first_record_id) is None
    assert db_session.get(DNSRecord, second_record_id) is not None
    assert db_session.get(User, user.id) is not None
