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
from app.models.enums import DNSRecordType, HostedZoneType
from app.models.hosted_zone import HostedZone
from app.models.user import User

pytestmark = pytest.mark.anyio


async def login(
    client: AsyncClient,
    *,
    email: str,
    password: str,
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def demo_headers(
    client: AsyncClient,
    settings: Settings,
) -> dict[str, str]:
    return await login(
        client,
        email=settings.demo_user_email,
        password=settings.demo_user_password,
    )


async def create_zone(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    name: str,
    zone_type: str = "PUBLIC",
    comment: str | None = "Test zone",
) -> Response:
    return await client.post(
        "/api/v1/hosted-zones",
        headers=headers,
        json={
            "name": name,
            "zone_type": zone_type,
            "comment": comment,
        },
    )


def add_user(
    engine: Engine,
    *,
    email: str = "other@example.com",
    password: str = "OtherUserPassword123!",
) -> str:
    with DatabaseSession(engine, expire_on_commit=False) as db:
        user = User(
            name="Other User",
            email=email,
            password_hash=hash_password(password),
        )
        db.add(user)
        db.commit()
        return user.id


def get_user_id(engine: Engine, email: str) -> str:
    with DatabaseSession(engine) as db:
        user_id = db.scalar(select(User.id).where(User.email == email))
        assert user_id is not None
        return user_id


def insert_zone(
    engine: Engine,
    *,
    user_id: str,
    name: str,
    zone_type: HostedZoneType = HostedZoneType.PUBLIC,
    comment: str | None = None,
    record_count: int = 0,
    created_at: datetime | None = None,
    updated_at: datetime | None = None,
) -> str:
    with DatabaseSession(engine, expire_on_commit=False) as db:
        zone = HostedZone(
            user_id=user_id,
            name=name,
            comment=comment,
            zone_type=zone_type,
        )
        if created_at is not None:
            zone.created_at = created_at
        if updated_at is not None:
            zone.updated_at = updated_at
        db.add(zone)
        db.flush()
        record_types = [
            DNSRecordType.A,
            DNSRecordType.AAAA,
            DNSRecordType.MX,
        ]
        for index in range(record_count):
            db.add(
                DNSRecord(
                    hosted_zone_id=zone.id,
                    name=f"record-{index}.{name}",
                    record_type=record_types[index],
                    values=["192.0.2.1"],
                    ttl=300,
                )
            )
        db.commit()
        return zone.id


async def test_create_public_zone_canonicalizes_and_persists_system_records(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)

    response = await create_zone(
        auth_client,
        headers,
        name="  Example.COM  ",
        comment="  Public website zone  ",
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload.keys() == {
        "id",
        "name",
        "comment",
        "zone_type",
        "record_count",
        "name_servers",
        "created_at",
        "updated_at",
    }
    assert payload["name"] == "example.com."
    assert payload["comment"] == "Public website zone"
    assert payload["zone_type"] == "PUBLIC"
    assert payload["record_count"] == 2
    assert len(payload["name_servers"]) == 4
    assert response.headers["location"].endswith(payload["id"])
    assert "user_id" not in response.text

    with DatabaseSession(database_engine) as db:
        zone = db.get(HostedZone, payload["id"])
        assert zone is not None
        assert zone.user_id == get_user_id(
            database_engine,
            settings.demo_user_email,
        )
        records = list(
            db.scalars(
                select(DNSRecord)
                .where(DNSRecord.hosted_zone_id == zone.id)
                .order_by(DNSRecord.record_type)
            )
        )
        assert {record.record_type for record in records} == {
            DNSRecordType.NS,
            DNSRecordType.SOA,
        }
        assert all(record.is_system for record in records)
        ns_record = next(
            record
            for record in records
            if record.record_type is DNSRecordType.NS
        )
        soa_record = next(
            record
            for record in records
            if record.record_type is DNSRecordType.SOA
        )
        assert len(ns_record.values) == 4
        assert len(soa_record.values) == 1


async def test_create_private_zone_has_no_system_records_and_null_comment(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)

    response = await create_zone(
        auth_client,
        headers,
        name="internal.example",
        zone_type="PRIVATE",
        comment="   ",
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["comment"] is None
    assert payload["record_count"] == 0
    assert payload["name_servers"] == []
    with DatabaseSession(database_engine) as db:
        count = db.scalar(
            select(func.count())
            .select_from(DNSRecord)
            .where(DNSRecord.hosted_zone_id == payload["id"])
        )
        assert count == 0


async def test_duplicate_scope_allows_type_and_user_variants(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)
    other_password = "OtherUserPassword123!"
    add_user(database_engine, password=other_password)
    other_headers = await login(
        auth_client,
        email="other@example.com",
        password=other_password,
    )

    first = await create_zone(auth_client, headers, name="shared.example")
    duplicate = await create_zone(
        auth_client,
        headers,
        name="SHARED.EXAMPLE.",
    )
    private_variant = await create_zone(
        auth_client,
        headers,
        name="shared.example",
        zone_type="PRIVATE",
    )
    other_user_variant = await create_zone(
        auth_client,
        other_headers,
        name="shared.example",
    )

    assert first.status_code == 201
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == {
        "code": "HOSTED_ZONE_ALREADY_EXISTS",
        "message": "A PUBLIC hosted zone already exists for shared.example.",
    }
    assert private_variant.status_code == 201
    assert other_user_variant.status_code == 201


@pytest.mark.parametrize(
    ("payload", "expected_status"),
    [
        (
            {
                "name": "https://example.com",
                "zone_type": "PUBLIC",
            },
            422,
        ),
        (
            {
                "name": "example.com",
                "zone_type": "PUBLIC",
                "comment": "x" * 257,
            },
            422,
        ),
        (
            {
                "name": "example.com",
                "zone_type": "PUBLIC",
                "user_id": "client-controlled",
            },
            422,
        ),
    ],
)
async def test_create_rejects_invalid_or_client_controlled_fields(
    auth_client: AsyncClient,
    settings: Settings,
    payload: dict[str, Any],
    expected_status: int,
) -> None:
    headers = await demo_headers(auth_client, settings)

    response = await auth_client.post(
        "/api/v1/hosted-zones",
        headers=headers,
        json=payload,
    )

    assert response.status_code == expected_status
    if payload["name"] == "https://example.com":
        assert response.json()["detail"]["code"] == "VALIDATION_ERROR"


async def test_list_empty_uses_default_pagination_shape(
    auth_client: AsyncClient,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)

    response = await auth_client.get(
        "/api/v1/hosted-zones",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == {
        "items": [],
        "page": 1,
        "page_size": 10,
        "total": 0,
        "total_pages": 0,
    }


async def test_list_scopes_searches_filters_and_counts_records(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)
    user_id = get_user_id(database_engine, settings.demo_user_email)
    other_user_id = add_user(database_engine)
    insert_zone(
        database_engine,
        user_id=user_id,
        name="api.example.org.",
        comment="Production Edge",
        record_count=2,
    )
    insert_zone(
        database_engine,
        user_id=user_id,
        name="internal.example.org.",
        zone_type=HostedZoneType.PRIVATE,
        comment="Private workload",
        record_count=1,
    )
    insert_zone(
        database_engine,
        user_id=other_user_id,
        name="other.example.org.",
        comment="Production Edge",
        record_count=3,
    )

    name_search = await auth_client.get(
        "/api/v1/hosted-zones?search=API.EXAMPLE",
        headers=headers,
    )
    comment_search = await auth_client.get(
        "/api/v1/hosted-zones?search=production",
        headers=headers,
    )
    private_filter = await auth_client.get(
        "/api/v1/hosted-zones?zone_type=PRIVATE",
        headers=headers,
    )
    empty_search = await auth_client.get(
        "/api/v1/hosted-zones?search=%20%20",
        headers=headers,
    )

    assert [item["name"] for item in name_search.json()["items"]] == [
        "api.example.org."
    ]
    assert name_search.json()["items"][0]["record_count"] == 2
    assert [item["name"] for item in comment_search.json()["items"]] == [
        "api.example.org."
    ]
    assert [item["name"] for item in private_filter.json()["items"]] == [
        "internal.example.org."
    ]
    assert empty_search.json()["total"] == 2


async def test_list_pagination_is_stable_and_totals_are_accurate(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)
    user_id = get_user_id(database_engine, settings.demo_user_email)
    for index in range(5):
        insert_zone(
            database_engine,
            user_id=user_id,
            name=f"zone-{index}.example.",
            zone_type=HostedZoneType.PUBLIC,
        )

    pages = [
        await auth_client.get(
            (
                "/api/v1/hosted-zones?page="
                f"{page}&page_size=2&sort_by=zone_type&sort_order=asc"
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
    assert all(response.status_code == 200 for response in pages)
    assert all(response.json()["total"] == 5 for response in pages)
    assert all(response.json()["total_pages"] == 3 for response in pages)
    assert [len(response.json()["items"]) for response in pages] == [2, 2, 1]
    assert len(ids) == len(set(ids)) == 5


@pytest.mark.parametrize(
    ("sort_by", "ascending_names"),
    [
        ("name", ["alpha.example.", "beta.example."]),
        ("zone_type", ["beta.example.", "alpha.example."]),
        ("created_at", ["alpha.example.", "beta.example."]),
        ("updated_at", ["alpha.example.", "beta.example."]),
    ],
)
async def test_list_supports_every_sort_field_in_both_orders(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
    sort_by: str,
    ascending_names: list[str],
) -> None:
    headers = await demo_headers(auth_client, settings)
    user_id = get_user_id(database_engine, settings.demo_user_email)
    earlier = datetime(2025, 1, 1, tzinfo=timezone.utc)
    later = earlier + timedelta(days=1)
    insert_zone(
        database_engine,
        user_id=user_id,
        name="alpha.example.",
        zone_type=HostedZoneType.PUBLIC,
        created_at=earlier,
        updated_at=earlier,
    )
    insert_zone(
        database_engine,
        user_id=user_id,
        name="beta.example.",
        zone_type=HostedZoneType.PRIVATE,
        created_at=later,
        updated_at=later,
    )

    ascending = await auth_client.get(
        f"/api/v1/hosted-zones?sort_by={sort_by}&sort_order=asc",
        headers=headers,
    )
    descending = await auth_client.get(
        f"/api/v1/hosted-zones?sort_by={sort_by}&sort_order=desc",
        headers=headers,
    )

    assert [item["name"] for item in ascending.json()["items"]] == (
        ascending_names
    )
    assert [item["name"] for item in descending.json()["items"]] == list(
        reversed(ascending_names)
    )


@pytest.mark.parametrize(
    "query",
    [
        "page=0",
        "page_size=101",
        "page_size=0",
        "sort_by=record_count",
        "sort_order=sideways",
        "zone_type=UNKNOWN",
    ],
)
async def test_list_rejects_invalid_query_parameters(
    auth_client: AsyncClient,
    settings: Settings,
    query: str,
) -> None:
    headers = await demo_headers(auth_client, settings)

    response = await auth_client.get(
        f"/api/v1/hosted-zones?{query}",
        headers=headers,
    )

    assert response.status_code == 422


async def test_list_uses_bounded_queries_instead_of_record_count_n_plus_one(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)
    user_id = get_user_id(database_engine, settings.demo_user_email)
    for index in range(4):
        insert_zone(
            database_engine,
            user_id=user_id,
            name=f"query-{index}.example.",
            record_count=2,
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
            "/api/v1/hosted-zones",
            headers=headers,
        )
    finally:
        event.remove(
            database_engine,
            "before_cursor_execute",
            capture_statement,
        )

    assert response.status_code == 200
    assert response.json()["total"] == 4
    assert len(statements) == 3


async def test_detail_returns_persisted_nameservers_and_conceals_ownership(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)
    created = await create_zone(
        auth_client,
        headers,
        name="detail.example",
    )
    payload = created.json()
    other_user_id = add_user(database_engine)
    other_zone_id = insert_zone(
        database_engine,
        user_id=other_user_id,
        name="hidden.example.",
    )

    detail = await auth_client.get(
        f"/api/v1/hosted-zones/{payload['id']}",
        headers=headers,
    )
    missing = await auth_client.get(
        "/api/v1/hosted-zones/Z00000000000000000000",
        headers=headers,
    )
    unowned = await auth_client.get(
        f"/api/v1/hosted-zones/{other_zone_id}",
        headers=headers,
    )

    assert detail.status_code == 200
    assert detail.json()["record_count"] == 2
    assert detail.json()["name_servers"] == payload["name_servers"]
    assert "user_id" not in detail.text
    assert missing.status_code == unowned.status_code == 404
    assert missing.json() == unowned.json() == {
        "detail": {
            "code": "HOSTED_ZONE_NOT_FOUND",
            "message": "The hosted zone was not found.",
        }
    }


async def test_private_zone_detail_has_empty_name_servers(
    auth_client: AsyncClient,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)
    created = await create_zone(
        auth_client,
        headers,
        name="private-detail.example",
        zone_type="PRIVATE",
    )

    detail = await auth_client.get(
        f"/api/v1/hosted-zones/{created.json()['id']}",
        headers=headers,
    )

    assert detail.status_code == 200
    assert detail.json()["name_servers"] == []
    assert detail.json()["record_count"] == 0


async def test_update_changes_only_comment_and_preserves_system_records(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)
    created = await create_zone(
        auth_client,
        headers,
        name="update.example",
    )
    original = created.json()

    updated = await auth_client.patch(
        f"/api/v1/hosted-zones/{original['id']}",
        headers=headers,
        json={"comment": "  Updated description  "},
    )

    assert updated.status_code == 200
    payload = updated.json()
    assert payload["comment"] == "Updated description"
    assert payload["name"] == original["name"]
    assert payload["zone_type"] == original["zone_type"]
    assert payload["record_count"] == original["record_count"] == 2
    assert payload["name_servers"] == original["name_servers"]
    assert payload["updated_at"] > original["updated_at"]
    with DatabaseSession(database_engine) as db:
        records = list(
            db.scalars(
                select(DNSRecord).where(
                    DNSRecord.hosted_zone_id == original["id"]
                )
            )
        )
        assert len(records) == 2

    cleared = await auth_client.patch(
        f"/api/v1/hosted-zones/{original['id']}",
        headers=headers,
        json={"comment": "   "},
    )
    assert cleared.status_code == 200
    assert cleared.json()["comment"] is None


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"name": "changed.example"},
        {"zone_type": "PRIVATE"},
        {"user_id": "changed"},
        {"unknown": "field"},
        {"comment": "x" * 257},
    ],
)
async def test_update_rejects_immutable_unknown_empty_or_overlong_fields(
    auth_client: AsyncClient,
    settings: Settings,
    payload: dict[str, Any],
) -> None:
    headers = await demo_headers(auth_client, settings)
    created = await create_zone(auth_client, headers, name="immutable.example")

    response = await auth_client.patch(
        f"/api/v1/hosted-zones/{created.json()['id']}",
        headers=headers,
        json=payload,
    )

    assert response.status_code == 422


async def test_update_conceals_unowned_and_unknown_zones(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)
    other_user_id = add_user(database_engine)
    other_zone_id = insert_zone(
        database_engine,
        user_id=other_user_id,
        name="unowned-update.example.",
    )

    unowned = await auth_client.patch(
        f"/api/v1/hosted-zones/{other_zone_id}",
        headers=headers,
        json={"comment": "No access"},
    )
    unknown = await auth_client.patch(
        "/api/v1/hosted-zones/Z00000000000000000000",
        headers=headers,
        json={"comment": None},
    )

    assert unowned.status_code == unknown.status_code == 404
    assert unowned.json() == unknown.json()


async def test_delete_cascades_all_records_and_returns_empty_204(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)
    created = await create_zone(
        auth_client,
        headers,
        name="delete.example",
    )
    zone_id = created.json()["id"]
    with DatabaseSession(database_engine) as db:
        db.add(
            DNSRecord(
                hosted_zone_id=zone_id,
                name="www.delete.example.",
                record_type=DNSRecordType.A,
                values=["192.0.2.20"],
                ttl=300,
            )
        )
        db.commit()

    deleted = await auth_client.delete(
        f"/api/v1/hosted-zones/{zone_id}",
        headers=headers,
    )
    second_delete = await auth_client.delete(
        f"/api/v1/hosted-zones/{zone_id}",
        headers=headers,
    )

    assert deleted.status_code == 204
    assert deleted.content == b""
    assert second_delete.status_code == 404
    with DatabaseSession(database_engine) as db:
        assert db.get(HostedZone, zone_id) is None
        assert (
            db.scalar(
                select(func.count())
                .select_from(DNSRecord)
                .where(DNSRecord.hosted_zone_id == zone_id)
            )
            == 0
        )


async def test_delete_conceals_unowned_zone_and_preserves_other_users_rows(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    headers = await demo_headers(auth_client, settings)
    other_user_id = add_user(database_engine)
    other_zone_id = insert_zone(
        database_engine,
        user_id=other_user_id,
        name="preserved.example.",
        record_count=1,
    )

    response = await auth_client.delete(
        f"/api/v1/hosted-zones/{other_zone_id}",
        headers=headers,
    )

    assert response.status_code == 404
    with DatabaseSession(database_engine) as db:
        assert db.get(HostedZone, other_zone_id) is not None
        assert (
            db.scalar(
                select(func.count())
                .select_from(DNSRecord)
                .where(DNSRecord.hosted_zone_id == other_zone_id)
            )
            == 1
        )


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("GET", "/api/v1/hosted-zones", None),
        (
            "POST",
            "/api/v1/hosted-zones",
            {"name": "auth.example", "zone_type": "PUBLIC"},
        ),
        ("GET", "/api/v1/hosted-zones/Z00000000000000000000", None),
        (
            "PATCH",
            "/api/v1/hosted-zones/Z00000000000000000000",
            {"comment": "Updated"},
        ),
        ("DELETE", "/api/v1/hosted-zones/Z00000000000000000000", None),
    ],
)
async def test_all_hosted_zone_endpoints_require_authentication(
    auth_client: AsyncClient,
    method: str,
    path: str,
    payload: dict[str, Any] | None,
) -> None:
    response = await auth_client.request(method, path, json=payload)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["detail"]["code"] == "AUTHENTICATION_REQUIRED"


async def test_openapi_documents_hosted_zone_operations_and_schemas(
    auth_client: AsyncClient,
) -> None:
    openapi = (await auth_client.get("/api/v1/openapi.json")).json()

    collection = openapi["paths"]["/api/v1/hosted-zones"]
    detail = openapi["paths"]["/api/v1/hosted-zones/{zone_id}"]
    assert set(collection) == {"get", "post"}
    assert set(detail) == {"get", "patch", "delete"}
    assert {
        parameter["name"] for parameter in collection["get"]["parameters"]
    } == {
        "search",
        "zone_type",
        "page",
        "page_size",
        "sort_by",
        "sort_order",
        "authorization",
    }
    assert collection["post"]["responses"].keys() >= {"201", "401", "409", "422"}
    assert detail["delete"]["responses"].keys() >= {"204", "401", "404"}
    schemas = openapi["components"]["schemas"]
    assert {
        "HostedZoneCreate",
        "HostedZoneDetail",
        "HostedZoneListItem",
        "HostedZoneListResponse",
        "HostedZoneUpdate",
    }.issubset(schemas)
