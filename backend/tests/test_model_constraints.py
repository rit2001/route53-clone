from datetime import timedelta

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DatabaseSession

from app.models import (
    DNSRecord,
    DNSRecordType,
    HostedZone,
    HostedZoneType,
    Session,
    User,
)
from app.models.base import generate_uuid, utc_now
from app.models.dns_record import MAX_TTL


def build_user(email: str) -> User:
    return User(
        name="Constraint Test User",
        email=email,
        password_hash="hashed-password-placeholder",
    )


def test_duplicate_user_emails_are_rejected(
    db_session: DatabaseSession,
) -> None:
    db_session.add_all(
        [
            build_user("duplicate@example.com"),
            build_user("duplicate@example.com"),
        ]
    )

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_duplicate_session_token_hashes_are_rejected(
    db_session: DatabaseSession,
) -> None:
    user = build_user("sessions@example.com")
    expires_at = utc_now() + timedelta(hours=24)
    db_session.add_all(
        [
            Session(user=user, token_hash="same-hash", expires_at=expires_at),
            Session(user=user, token_hash="same-hash", expires_at=expires_at),
        ]
    )

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_duplicate_hosted_zone_scope_is_rejected(
    db_session: DatabaseSession,
) -> None:
    user = build_user("zones@example.com")
    db_session.add_all(
        [
            HostedZone(
                user=user,
                name="example.com.",
                zone_type=HostedZoneType.PUBLIC,
            ),
            HostedZone(
                user=user,
                name="example.com.",
                zone_type=HostedZoneType.PUBLIC,
            ),
        ]
    )

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_duplicate_record_set_scope_is_rejected(
    db_session: DatabaseSession,
) -> None:
    zone = HostedZone(
        user=build_user("records@example.com"),
        name="example.com.",
        zone_type=HostedZoneType.PUBLIC,
    )
    db_session.add_all(
        [
            DNSRecord(
                hosted_zone=zone,
                name="www.example.com.",
                record_type=DNSRecordType.A,
                values=["192.0.2.10"],
                ttl=300,
            ),
            DNSRecord(
                hosted_zone=zone,
                name="www.example.com.",
                record_type=DNSRecordType.A,
                values=["192.0.2.11"],
                ttl=300,
            ),
        ]
    )

    with pytest.raises(IntegrityError):
        db_session.commit()


@pytest.mark.parametrize("invalid_ttl", [0, MAX_TTL + 1])
def test_out_of_range_ttl_is_rejected(
    db_session: DatabaseSession,
    invalid_ttl: int,
) -> None:
    record = DNSRecord(
        hosted_zone=HostedZone(
            user=build_user(f"ttl-{invalid_ttl}@example.com"),
            name="example.com.",
            zone_type=HostedZoneType.PUBLIC,
        ),
        name="www.example.com.",
        record_type=DNSRecordType.A,
        values=["192.0.2.10"],
        ttl=invalid_ttl,
    )
    db_session.add(record)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_missing_foreign_key_parent_is_rejected(
    db_session: DatabaseSession,
) -> None:
    db_session.add(
        Session(
            user_id=generate_uuid(),
            token_hash="orphan-token-hash",
            expires_at=utc_now() + timedelta(hours=24),
        )
    )

    with pytest.raises(IntegrityError):
        db_session.commit()
