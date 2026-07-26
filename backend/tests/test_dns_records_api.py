from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
from httpx import AsyncClient, Response
from sqlalchemy import event, func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session as DatabaseSession

from app.core.config import Settings
from app.core.security import hash_password
from app.models.dns_record import DNSRecord
from app.models.enums import (
    DNSRecordType,
    HostedZoneType,
    RoutingPolicy,
)
from app.models.hosted_zone import HostedZone
from app.models.user import User

pytestmark = pytest.mark.anyio

RECORD_RESPONSE_KEYS = {
    "id",
    "name",
    "record_type",
    "values",
    "ttl",
    "routing_policy",
    "alias",
    "is_system",
    "created_at",
    "updated_at",
}


async def auth_headers(
    client: AsyncClient,
    settings: Settings,
    *,
    email: str | None = None,
    password: str | None = None,
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": email or settings.demo_user_email,
            "password": password or settings.demo_user_password,
        },
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def create_zone(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    name: str = "example.com",
    zone_type: str = "PRIVATE",
) -> dict[str, Any]:
    response = await client.post(
        "/api/v1/hosted-zones",
        headers=headers,
        json={"name": name, "zone_type": zone_type},
    )
    assert response.status_code == 201
    return response.json()


async def create_record(
    client: AsyncClient,
    headers: dict[str, str],
    zone_id: str,
    *,
    name: str | None = "api",
    record_type: str = "A",
    values: list[str] | None = None,
    ttl: int = 300,
    routing_policy: str | None = None,
    alias: bool | None = None,
) -> Response:
    payload: dict[str, Any] = {
        "record_type": record_type,
        "values": values or ["192.0.2.10"],
        "ttl": ttl,
    }
    if name is not None:
        payload["name"] = name
    if routing_policy is not None:
        payload["routing_policy"] = routing_policy
    if alias is not None:
        payload["alias"] = alias
    return await client.post(
        f"/api/v1/hosted-zones/{zone_id}/records",
        headers=headers,
        json=payload,
    )


def get_user_id(engine: Engine, email: str) -> str:
    with DatabaseSession(engine) as db:
        user_id = db.scalar(select(User.id).where(User.email == email))
        assert user_id is not None
        return user_id


def add_user(
    engine: Engine,
    *,
    email: str = "other-records@example.com",
    password: str = "OtherRecordsPassword123!",
) -> str:
    with DatabaseSession(engine, expire_on_commit=False) as db:
        user = User(
            name="Other Records User",
            email=email,
            password_hash=hash_password(password),
        )
        db.add(user)
        db.commit()
        return user.id


def insert_zone(
    engine: Engine,
    *,
    user_id: str,
    name: str,
) -> str:
    with DatabaseSession(engine, expire_on_commit=False) as db:
        zone = HostedZone(
            user_id=user_id,
            name=name,
            zone_type=HostedZoneType.PRIVATE,
        )
        db.add(zone)
        db.commit()
        return zone.id


def insert_record(
    engine: Engine,
    *,
    zone_id: str,
    name: str,
    record_type: DNSRecordType,
    values: list[str],
    ttl: int = 300,
    alias: bool = False,
    is_system: bool = False,
    created_at: datetime | None = None,
    updated_at: datetime | None = None,
) -> str:
    with DatabaseSession(engine, expire_on_commit=False) as db:
        record = DNSRecord(
            hosted_zone_id=zone_id,
            name=name,
            record_type=record_type,
            values=values,
            ttl=ttl,
            alias=alias,
            is_system=is_system,
        )
        if created_at is not None:
            record.created_at = created_at
        if updated_at is not None:
            record.updated_at = updated_at
        db.add(record)
        db.commit()
        return record.id


@pytest.mark.parametrize(
    (
        "record_type",
        "name",
        "values",
        "expected_name",
        "expected_values",
    ),
    [
        (
            "A",
            "api",
            ["192.0.2.10", "192.0.2.10", "8.8.8.8"],
            "api.example.com.",
            ["192.0.2.10", "8.8.8.8"],
        ),
        (
            "AAAA",
            "ipv6",
            ["2001:0DB8:0:0:0:0:0:1"],
            "ipv6.example.com.",
            ["2001:db8::1"],
        ),
        (
            "CNAME",
            "www",
            ["Target.Example.NET"],
            "www.example.com.",
            ["target.example.net."],
        ),
        (
            "TXT",
            None,
            ['  "verification value"  '],
            "example.com.",
            ['"verification value"'],
        ),
        (
            "MX",
            "@",
            ["010  Mail.Example.NET"],
            "example.com.",
            ["10 mail.example.net."],
        ),
        (
            "NS",
            "delegated",
            ["NS1.Example.NET", "ns2.example.net."],
            "delegated.example.com.",
            ["ns1.example.net.", "ns2.example.net."],
        ),
        (
            "PTR",
            "pointer",
            ["Host.Example.NET"],
            "pointer.example.com.",
            ["host.example.net."],
        ),
        (
            "SRV",
            "_SIP._TCP",
            ["010 005 05060 SIP.Example.NET"],
            "_sip._tcp.example.com.",
            ["10 5 5060 sip.example.net."],
        ),
        (
            "CAA",
            "@",
            ['000 issue "letsencrypt.org"'],
            "example.com.",
            ['0 issue "letsencrypt.org"'],
        ),
    ],
)
async def test_create_every_supported_record_type_and_persist(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
    record_type: str,
    name: str | None,
    values: list[str],
    expected_name: str,
    expected_values: list[str],
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)

    response = await create_record(
        auth_client,
        headers,
        zone["id"],
        name=name,
        record_type=record_type,
        values=values,
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload.keys() == RECORD_RESPONSE_KEYS
    assert payload["name"] == expected_name
    assert payload["values"] == expected_values
    assert payload["record_type"] == record_type
    assert payload["routing_policy"] == "SIMPLE"
    assert payload["alias"] is False
    assert payload["is_system"] is False
    assert "hosted_zone_id" not in response.text
    assert response.headers["location"].endswith(payload["id"])
    with DatabaseSession(database_engine) as db:
        record = db.get(DNSRecord, payload["id"])
        assert record is not None
        assert record.hosted_zone_id == zone["id"]
        assert record.values == expected_values


async def test_create_valid_wildcard_record(
    auth_client: AsyncClient,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)

    response = await create_record(
        auth_client,
        headers,
        zone["id"],
        name="*.api",
    )

    assert response.status_code == 201
    assert response.json()["name"] == "*.api.example.com."


async def test_duplicate_and_cname_conflicts_use_stable_errors(
    auth_client: AsyncClient,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)
    first_a = await create_record(auth_client, headers, zone["id"], name="api")
    duplicate_a = await create_record(
        auth_client,
        headers,
        zone["id"],
        name="API.EXAMPLE.COM.",
        values=["192.0.2.20"],
    )
    cname_over_a = await create_record(
        auth_client,
        headers,
        zone["id"],
        name="api",
        record_type="CNAME",
        values=["target.example.net"],
    )
    cname = await create_record(
        auth_client,
        headers,
        zone["id"],
        name="alias",
        record_type="CNAME",
        values=["target.example.net"],
    )
    a_over_cname = await create_record(
        auth_client,
        headers,
        zone["id"],
        name="alias",
        values=["192.0.2.30"],
    )
    apex_cname = await create_record(
        auth_client,
        headers,
        zone["id"],
        name="@",
        record_type="CNAME",
        values=["target.example.net"],
    )

    assert first_a.status_code == 201
    assert duplicate_a.status_code == 409
    assert duplicate_a.json()["detail"]["code"] == "DNS_RECORD_ALREADY_EXISTS"
    assert cname.status_code == 201
    for response in (cname_over_a, a_over_cname, apex_cname):
        assert response.status_code == 409
        assert response.json()["detail"]["code"] == "CNAME_CONFLICT"


@pytest.mark.parametrize(
    ("payload", "expected_code"),
    [
        (
            {
                "name": "alias",
                "record_type": "A",
                "values": ["192.0.2.1"],
                "ttl": 300,
                "alias": True,
            },
            "ALIAS_NOT_SUPPORTED",
        ),
        (
            {
                "name": "api",
                "record_type": "A",
                "values": ["192.0.2.1"],
                "ttl": 0,
            },
            None,
        ),
        (
            {
                "name": "api",
                "record_type": "A",
                "values": [],
                "ttl": 300,
            },
            None,
        ),
        (
            {
                "name": "api",
                "record_type": "A",
                "values": ["192.0.2.1"] * 101,
                "ttl": 300,
            },
            None,
        ),
        (
            {
                "name": "api",
                "record_type": "SOA",
                "values": ["not allowed"],
                "ttl": 300,
            },
            None,
        ),
        (
            {
                "name": "api",
                "record_type": "A",
                "values": ["   "],
                "ttl": 300,
            },
            "VALIDATION_ERROR",
        ),
        (
            {
                "name": "api",
                "record_type": "A",
                "values": ["192.0.2.1"],
                "ttl": 300,
                "is_system": True,
            },
            None,
        ),
        (
            {
                "name": "api",
                "record_type": "A",
                "values": ["192.0.2.1"],
                "ttl": 300,
                "hosted_zone_id": "client-controlled",
            },
            None,
        ),
        (
            {
                "name": "api",
                "record_type": "A",
                "values": ["192.0.2.1"],
                "ttl": 300,
                "id": "client-controlled",
            },
            None,
        ),
    ],
)
async def test_create_rejects_unsupported_or_invalid_fields(
    auth_client: AsyncClient,
    settings: Settings,
    payload: dict[str, Any],
    expected_code: str | None,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)

    response = await auth_client.post(
        f"/api/v1/hosted-zones/{zone['id']}/records",
        headers=headers,
        json=payload,
    )

    assert response.status_code == 422
    if expected_code is not None:
        assert response.json()["detail"]["code"] == expected_code


async def test_create_requires_owned_existing_zone_and_authentication(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    other_user_id = add_user(database_engine)
    other_zone_id = insert_zone(
        database_engine,
        user_id=other_user_id,
        name="other.example.",
    )
    payload = {
        "name": "api",
        "record_type": "A",
        "values": ["192.0.2.1"],
        "ttl": 300,
    }

    unowned = await auth_client.post(
        f"/api/v1/hosted-zones/{other_zone_id}/records",
        headers=headers,
        json=payload,
    )
    unknown = await auth_client.post(
        "/api/v1/hosted-zones/Z00000000000000000000/records",
        headers=headers,
        json=payload,
    )
    missing_auth = await auth_client.post(
        f"/api/v1/hosted-zones/{other_zone_id}/records",
        json=payload,
    )

    assert unowned.status_code == unknown.status_code == 404
    assert unowned.json() == unknown.json()
    assert unowned.json()["detail"]["code"] == "HOSTED_ZONE_NOT_FOUND"
    assert missing_auth.status_code == 401
    assert missing_auth.json()["detail"]["code"] == "AUTHENTICATION_REQUIRED"


async def test_empty_private_and_public_system_record_lists(
    auth_client: AsyncClient,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    private_zone = await create_zone(auth_client, headers, name="private.example")
    public_zone = await create_zone(
        auth_client,
        headers,
        name="public.example",
        zone_type="PUBLIC",
    )

    empty = await auth_client.get(
        f"/api/v1/hosted-zones/{private_zone['id']}/records",
        headers=headers,
    )
    system = await auth_client.get(
        f"/api/v1/hosted-zones/{public_zone['id']}/records",
        headers=headers,
    )

    assert empty.json() == {
        "items": [],
        "page": 1,
        "page_size": 25,
        "total": 0,
        "total_pages": 0,
    }
    assert system.status_code == 200
    assert system.json()["total"] == 2
    assert {
        item["record_type"] for item in system.json()["items"]
    } == {"NS", "SOA"}
    assert all(item["is_system"] for item in system.json()["items"])


async def test_list_scopes_searches_and_filters_records(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)
    other_zone = await create_zone(
        auth_client,
        headers,
        name="second.example",
    )
    await create_record(
        auth_client,
        headers,
        zone["id"],
        name="Api",
        values=["192.0.2.10"],
    )
    await create_record(
        auth_client,
        headers,
        zone["id"],
        name="mail",
        record_type="MX",
        values=["10 mail.external.example"],
    )
    await create_record(
        auth_client,
        headers,
        other_zone["id"],
        name="api",
        values=["192.0.2.99"],
    )
    alias_id = insert_record(
        database_engine,
        zone_id=zone["id"],
        name="legacy.example.com.",
        record_type=DNSRecordType.TXT,
        values=["legacy alias"],
        alias=True,
    )

    by_name = await auth_client.get(
        f"/api/v1/hosted-zones/{zone['id']}/records?search=API",
        headers=headers,
    )
    by_value = await auth_client.get(
        f"/api/v1/hosted-zones/{zone['id']}/records?search=192.0.2",
        headers=headers,
    )
    by_type = await auth_client.get(
        f"/api/v1/hosted-zones/{zone['id']}/records?record_type=MX",
        headers=headers,
    )
    by_policy = await auth_client.get(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records"
            "?routing_policy=SIMPLE"
        ),
        headers=headers,
    )
    by_alias = await auth_client.get(
        f"/api/v1/hosted-zones/{zone['id']}/records?alias=true",
        headers=headers,
    )
    empty_search = await auth_client.get(
        f"/api/v1/hosted-zones/{zone['id']}/records?search=%20%20",
        headers=headers,
    )

    assert [item["name"] for item in by_name.json()["items"]] == [
        "api.example.com."
    ]
    assert [item["name"] for item in by_value.json()["items"]] == [
        "api.example.com."
    ]
    assert [item["record_type"] for item in by_type.json()["items"]] == ["MX"]
    assert by_policy.json()["total"] == 3
    assert [item["id"] for item in by_alias.json()["items"]] == [alias_id]
    assert empty_search.json()["total"] == 3


async def test_record_type_filter_includes_every_readable_type(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)
    for index, record_type in enumerate(DNSRecordType):
        insert_record(
            database_engine,
            zone_id=zone["id"],
            name=f"type-{index}.example.com.",
            record_type=record_type,
            values=["test value"],
            is_system=record_type is DNSRecordType.SOA,
        )

    for record_type in DNSRecordType:
        response = await auth_client.get(
            (
                f"/api/v1/hosted-zones/{zone['id']}/records"
                f"?record_type={record_type.value}"
            ),
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["total"] == 1
        assert response.json()["items"][0]["record_type"] == record_type.value


@pytest.mark.parametrize(
    ("sort_by", "ascending_names"),
    [
        ("name", ["alpha.example.com.", "beta.example.com."]),
        ("record_type", ["alpha.example.com.", "beta.example.com."]),
        ("ttl", ["alpha.example.com.", "beta.example.com."]),
        ("created_at", ["alpha.example.com.", "beta.example.com."]),
        ("updated_at", ["alpha.example.com.", "beta.example.com."]),
    ],
)
async def test_list_supports_every_sort_field_and_order(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
    sort_by: str,
    ascending_names: list[str],
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)
    earlier = datetime(2025, 1, 1, tzinfo=timezone.utc)
    later = earlier + timedelta(days=1)
    insert_record(
        database_engine,
        zone_id=zone["id"],
        name="alpha.example.com.",
        record_type=DNSRecordType.A,
        values=["192.0.2.1"],
        ttl=100,
        created_at=earlier,
        updated_at=earlier,
    )
    insert_record(
        database_engine,
        zone_id=zone["id"],
        name="beta.example.com.",
        record_type=DNSRecordType.TXT,
        values=["text"],
        ttl=200,
        created_at=later,
        updated_at=later,
    )

    ascending = await auth_client.get(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records"
            f"?sort_by={sort_by}&sort_order=asc"
        ),
        headers=headers,
    )
    descending = await auth_client.get(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records"
            f"?sort_by={sort_by}&sort_order=desc"
        ),
        headers=headers,
    )

    assert [item["name"] for item in ascending.json()["items"]] == (
        ascending_names
    )
    assert [item["name"] for item in descending.json()["items"]] == list(
        reversed(ascending_names)
    )


async def test_list_pagination_is_stable_with_accurate_totals(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)
    record_types = list(DNSRecordType)[:5]
    for record_type in record_types:
        insert_record(
            database_engine,
            zone_id=zone["id"],
            name="same.example.com.",
            record_type=record_type,
            values=["test"],
        )

    pages = [
        await auth_client.get(
            (
                f"/api/v1/hosted-zones/{zone['id']}/records"
                f"?page={page}&page_size=2&sort_by=name"
            ),
            headers=headers,
        )
        for page in (1, 2, 3)
    ]
    ids = [
        item["id"]
        for response in pages
        for item in response.json()["items"]
    ]

    assert all(response.json()["total"] == 5 for response in pages)
    assert all(response.json()["total_pages"] == 3 for response in pages)
    assert [len(response.json()["items"]) for response in pages] == [2, 2, 1]
    assert len(ids) == len(set(ids)) == 5


@pytest.mark.parametrize(
    "query",
    [
        "page=0",
        "page_size=0",
        "page_size=101",
        "record_type=UNKNOWN",
        "routing_policy=WEIGHTED",
        "alias=maybe",
        "sort_by=values",
        "sort_order=sideways",
    ],
)
async def test_list_rejects_invalid_query_parameters(
    auth_client: AsyncClient,
    settings: Settings,
    query: str,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)

    response = await auth_client.get(
        f"/api/v1/hosted-zones/{zone['id']}/records?{query}",
        headers=headers,
    )

    assert response.status_code == 422


async def test_record_list_query_count_is_bounded(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)
    for index, record_type in enumerate(list(DNSRecordType)[:5]):
        insert_record(
            database_engine,
            zone_id=zone["id"],
            name=f"query-{index}.example.com.",
            record_type=record_type,
            values=["test"],
        )
    statements: list[str] = []

    def capture_statement(
        _connection: object,
        _cursor: object,
        statement: str,
        _parameters: object,
        _context: object,
        _executemany: object,
    ) -> None:
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    event.listen(database_engine, "before_cursor_execute", capture_statement)
    try:
        response = await auth_client.get(
            f"/api/v1/hosted-zones/{zone['id']}/records",
            headers=headers,
        )
    finally:
        event.remove(
            database_engine,
            "before_cursor_execute",
            capture_statement,
        )

    assert response.status_code == 200
    assert response.json()["total"] == 5
    assert len(statements) == 4


async def test_detail_returns_user_and_system_records_without_internal_fields(
    auth_client: AsyncClient,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(
        auth_client,
        headers,
        zone_type="PUBLIC",
    )
    created = await create_record(
        auth_client,
        headers,
        zone["id"],
        name="api",
    )
    records = await auth_client.get(
        f"/api/v1/hosted-zones/{zone['id']}/records",
        headers=headers,
    )
    ns_record = next(
        item
        for item in records.json()["items"]
        if item["record_type"] == "NS"
    )

    user_detail = await auth_client.get(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records/"
            f"{created.json()['id']}"
        ),
        headers=headers,
    )
    system_detail = await auth_client.get(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records/"
            f"{ns_record['id']}"
        ),
        headers=headers,
    )

    assert user_detail.status_code == system_detail.status_code == 200
    assert user_detail.json().keys() == RECORD_RESPONSE_KEYS
    assert system_detail.json()["is_system"] is True
    for response in (user_detail, system_detail):
        assert "hosted_zone_id" not in response.text
        assert "hosted_zone" not in response.text


async def test_detail_scopes_zone_before_record(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)
    second_zone = await create_zone(
        auth_client,
        headers,
        name="second.example",
    )
    other_record = await create_record(
        auth_client,
        headers,
        second_zone["id"],
    )
    other_user_id = add_user(database_engine)
    other_user_zone = insert_zone(
        database_engine,
        user_id=other_user_id,
        name="owned-by-other.example.",
    )
    other_user_record = insert_record(
        database_engine,
        zone_id=other_user_zone,
        name="api.owned-by-other.example.",
        record_type=DNSRecordType.A,
        values=["192.0.2.1"],
    )

    wrong_zone = await auth_client.get(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records/"
            f"{other_record.json()['id']}"
        ),
        headers=headers,
    )
    unknown_record = await auth_client.get(
        f"/api/v1/hosted-zones/{zone['id']}/records/missing",
        headers=headers,
    )
    unowned_zone = await auth_client.get(
        (
            f"/api/v1/hosted-zones/{other_user_zone}/records/"
            f"{other_user_record}"
        ),
        headers=headers,
    )

    assert wrong_zone.status_code == unknown_record.status_code == 404
    assert wrong_zone.json() == unknown_record.json()
    assert wrong_zone.json()["detail"]["code"] == "DNS_RECORD_NOT_FOUND"
    assert unowned_zone.status_code == 404
    assert unowned_zone.json()["detail"]["code"] == "HOSTED_ZONE_NOT_FOUND"


async def test_update_values_ttl_deduplicates_and_preserves_identity_and_count(
    auth_client: AsyncClient,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)
    created = await create_record(
        auth_client,
        headers,
        zone["id"],
        name="api",
    )
    original = created.json()

    updated = await auth_client.patch(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records/"
            f"{original['id']}"
        ),
        headers=headers,
        json={
            "values": ["192.0.2.20", "192.0.2.20", "192.0.2.21"],
            "ttl": 600,
        },
    )
    zone_detail = await auth_client.get(
        f"/api/v1/hosted-zones/{zone['id']}",
        headers=headers,
    )

    assert updated.status_code == 200
    payload = updated.json()
    assert payload["id"] == original["id"]
    assert payload["name"] == original["name"]
    assert payload["record_type"] == original["record_type"]
    assert payload["values"] == ["192.0.2.20", "192.0.2.21"]
    assert payload["ttl"] == 600
    assert payload["updated_at"] > original["updated_at"]
    assert zone_detail.json()["record_count"] == 1

    ttl_only = await auth_client.patch(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records/"
            f"{original['id']}"
        ),
        headers=headers,
        json={"ttl": 900},
    )
    values_only = await auth_client.patch(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records/"
            f"{original['id']}"
        ),
        headers=headers,
        json={"values": ["192.0.2.30"]},
    )
    assert ttl_only.json()["ttl"] == 900
    assert values_only.json()["values"] == ["192.0.2.30"]


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"values": ["not-an-ip"]},
        {"values": None},
        {"ttl": None},
        {"ttl": 0},
        {"name": "changed"},
        {"record_type": "TXT"},
        {"routing_policy": "SIMPLE"},
        {"alias": True},
        {"is_system": True},
        {"hosted_zone_id": "changed"},
        {"unknown": "field"},
    ],
)
async def test_update_rejects_invalid_empty_or_immutable_fields(
    auth_client: AsyncClient,
    settings: Settings,
    payload: dict[str, Any],
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)
    created = await create_record(auth_client, headers, zone["id"])

    response = await auth_client.patch(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records/"
            f"{created.json()['id']}"
        ),
        headers=headers,
        json=payload,
    )

    assert response.status_code == 422


@pytest.mark.parametrize("record_type", ["NS", "SOA"])
@pytest.mark.parametrize("operation", ["update", "delete"])
async def test_system_records_are_protected(
    auth_client: AsyncClient,
    settings: Settings,
    record_type: str,
    operation: str,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(
        auth_client,
        headers,
        zone_type="PUBLIC",
    )
    listed = await auth_client.get(
        f"/api/v1/hosted-zones/{zone['id']}/records",
        headers=headers,
    )
    record = next(
        item
        for item in listed.json()["items"]
        if item["record_type"] == record_type
    )
    path = (
        f"/api/v1/hosted-zones/{zone['id']}/records/{record['id']}"
    )

    if operation == "update":
        response = await auth_client.patch(
            path,
            headers=headers,
            json={"ttl": 60},
        )
    else:
        response = await auth_client.delete(path, headers=headers)

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "SYSTEM_RECORD_PROTECTED"


async def test_update_and_delete_enforce_zone_and_record_ownership(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)
    second_zone = await create_zone(
        auth_client,
        headers,
        name="second.example",
    )
    second_record = await create_record(
        auth_client,
        headers,
        second_zone["id"],
    )
    other_user_id = add_user(database_engine)
    other_zone = insert_zone(
        database_engine,
        user_id=other_user_id,
        name="other-owner.example.",
    )

    wrong_zone_update = await auth_client.patch(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records/"
            f"{second_record.json()['id']}"
        ),
        headers=headers,
        json={"ttl": 60},
    )
    wrong_zone_delete = await auth_client.delete(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records/"
            f"{second_record.json()['id']}"
        ),
        headers=headers,
    )
    unowned_update = await auth_client.patch(
        f"/api/v1/hosted-zones/{other_zone}/records/missing",
        headers=headers,
        json={"ttl": 60},
    )
    unowned_delete = await auth_client.delete(
        f"/api/v1/hosted-zones/{other_zone}/records/missing",
        headers=headers,
    )

    assert wrong_zone_update.json()["detail"]["code"] == "DNS_RECORD_NOT_FOUND"
    assert wrong_zone_delete.json()["detail"]["code"] == "DNS_RECORD_NOT_FOUND"
    assert unowned_update.json()["detail"]["code"] == "HOSTED_ZONE_NOT_FOUND"
    assert unowned_delete.json()["detail"]["code"] == "HOSTED_ZONE_NOT_FOUND"


async def test_delete_user_record_updates_count_and_preserves_other_records(
    auth_client: AsyncClient,
    settings: Settings,
) -> None:
    headers = await auth_headers(auth_client, settings)
    zone = await create_zone(auth_client, headers)
    first = await create_record(
        auth_client,
        headers,
        zone["id"],
        name="first",
    )
    second = await create_record(
        auth_client,
        headers,
        zone["id"],
        name="second",
    )

    deleted = await auth_client.delete(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records/"
            f"{first.json()['id']}"
        ),
        headers=headers,
    )
    second_delete = await auth_client.delete(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records/"
            f"{first.json()['id']}"
        ),
        headers=headers,
    )
    remaining = await auth_client.get(
        (
            f"/api/v1/hosted-zones/{zone['id']}/records/"
            f"{second.json()['id']}"
        ),
        headers=headers,
    )
    zone_detail = await auth_client.get(
        f"/api/v1/hosted-zones/{zone['id']}",
        headers=headers,
    )

    assert deleted.status_code == 204
    assert deleted.content == b""
    assert second_delete.status_code == 404
    assert second_delete.json()["detail"]["code"] == "DNS_RECORD_NOT_FOUND"
    assert remaining.status_code == 200
    assert zone_detail.json()["record_count"] == 1


@pytest.mark.parametrize(
    ("method", "suffix", "payload"),
    [
        ("GET", "", None),
        (
            "POST",
            "",
            {
                "record_type": "A",
                "values": ["192.0.2.1"],
                "ttl": 300,
            },
        ),
        ("GET", "/record-id", None),
        ("PATCH", "/record-id", {"ttl": 60}),
        ("DELETE", "/record-id", None),
    ],
)
async def test_all_record_endpoints_require_authentication(
    auth_client: AsyncClient,
    method: str,
    suffix: str,
    payload: dict[str, Any] | None,
) -> None:
    path = (
        "/api/v1/hosted-zones/Z00000000000000000000/records"
        f"{suffix}"
    )

    response = await auth_client.request(method, path, json=payload)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["detail"]["code"] == "AUTHENTICATION_REQUIRED"


async def test_openapi_documents_dns_record_contract(
    auth_client: AsyncClient,
) -> None:
    openapi = (await auth_client.get("/api/v1/openapi.json")).json()
    collection_path = "/api/v1/hosted-zones/{zone_id}/records"
    detail_path = f"{collection_path}/{{record_id}}"

    assert set(openapi["paths"][collection_path]) == {"get", "post"}
    assert set(openapi["paths"][detail_path]) == {"get", "patch", "delete"}
    schemas = openapi["components"]["schemas"]
    assert {
        "DNSRecordCreate",
        "DNSRecordListResponse",
        "DNSRecordResponse",
        "DNSRecordUpdate",
        "UserCreatableDNSRecordType",
    }.issubset(schemas)
    creatable_values = schemas["UserCreatableDNSRecordType"]["enum"]
    assert "SOA" not in creatable_values
    response_values = schemas["DNSRecordType"]["enum"]
    assert "SOA" in response_values
