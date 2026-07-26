from datetime import timedelta

import pytest
from httpx import AsyncClient, Response
from sqlalchemy import func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session as DatabaseSession

from app.core.config import Settings
from app.core.security import generate_session_token, hash_session_token
from app.models.base import utc_now
from app.models.session import Session

pytestmark = pytest.mark.anyio


async def login(
    client: AsyncClient,
    settings: Settings,
    *,
    email: str | None = None,
    password: str | None = None,
) -> Response:
    return await client.post(
        "/api/v1/auth/login",
        json={
            "email": email or settings.demo_user_email,
            "password": password or settings.demo_user_password,
        },
    )


def get_sessions(database_engine: Engine) -> list[Session]:
    with DatabaseSession(database_engine) as db:
        return list(db.scalars(select(Session).order_by(Session.created_at)))


async def test_valid_login_returns_schema_and_persists_only_token_hash(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    response = await login(auth_client, settings)

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    assert payload["user"].keys() == {"id", "name", "email", "created_at"}
    assert payload["user"]["name"] == settings.demo_user_name
    assert payload["user"]["email"] == settings.demo_user_email
    assert "password_hash" not in response.text

    sessions = get_sessions(database_engine)
    assert len(sessions) == 1
    assert sessions[0].token_hash == hash_session_token(payload["access_token"])
    assert sessions[0].token_hash != payload["access_token"]
    expected_ttl = timedelta(hours=settings.session_ttl_hours)
    actual_ttl = sessions[0].expires_at - sessions[0].created_at
    assert abs(actual_ttl - expected_ttl) < timedelta(seconds=1)


async def test_second_login_creates_independent_session(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    first_response = await login(auth_client, settings)
    second_response = await login(auth_client, settings)

    assert first_response.json()["access_token"] != (
        second_response.json()["access_token"]
    )
    assert len(get_sessions(database_engine)) == 2


@pytest.mark.parametrize(
    ("email", "password"),
    [
        ("unknown@route53.local", "Route53Demo123!"),
        ("demo@route53.local", "incorrect-password"),
    ],
)
async def test_invalid_credentials_use_same_public_error_and_create_no_session(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
    email: str,
    password: str,
) -> None:
    response = await login(
        auth_client,
        settings,
        email=email,
        password=password,
    )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {
        "detail": {
            "code": "INVALID_CREDENTIALS",
            "message": "The email or password is incorrect.",
        }
    }
    assert get_sessions(database_engine) == []


async def test_login_normalizes_email_case_and_whitespace(
    auth_client: AsyncClient,
    settings: Settings,
) -> None:
    response = await login(
        auth_client,
        settings,
        email="  DEMO@ROUTE53.LOCAL ",
    )

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "demo@route53.local"


async def test_login_validation_rejects_malformed_input(
    auth_client: AsyncClient,
) -> None:
    response = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "not-an-email", "password": ""},
    )

    assert response.status_code == 422


async def test_current_user_returns_authenticated_user_without_hash(
    auth_client: AsyncClient,
    settings: Settings,
) -> None:
    access_token = (await login(auth_client, settings)).json()["access_token"]

    response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 200
    assert response.json().keys() == {"id", "name", "email", "created_at"}
    assert response.json()["email"] == settings.demo_user_email
    assert "password_hash" not in response.text


async def test_missing_authorization_is_rejected(
    auth_client: AsyncClient,
) -> None:
    response = await auth_client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["detail"]["code"] == "AUTHENTICATION_REQUIRED"


@pytest.mark.parametrize(
    "authorization",
    [
        "Basic abc123",
        "Bearer malformed token",
        "Bearer short",
    ],
)
async def test_incorrect_scheme_or_malformed_token_is_rejected(
    auth_client: AsyncClient,
    authorization: str,
) -> None:
    response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": authorization},
    )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["detail"]["code"] == "INVALID_SESSION"


async def test_unknown_well_formed_token_is_rejected(
    auth_client: AsyncClient,
) -> None:
    response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {generate_session_token()}"},
    )

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_SESSION"


async def test_expired_session_is_deleted_and_cannot_be_reused(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    access_token = (await login(auth_client, settings)).json()["access_token"]
    with DatabaseSession(database_engine) as db:
        auth_session = db.scalar(
            select(Session).where(
                Session.token_hash == hash_session_token(access_token)
            )
        )
        assert auth_session is not None
        auth_session.expires_at = utc_now() - timedelta(seconds=1)
        db.commit()

    first_response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    second_response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert first_response.status_code == 401
    assert first_response.json()["detail"]["code"] == "SESSION_EXPIRED"
    assert second_response.status_code == 401
    assert second_response.json()["detail"]["code"] == "INVALID_SESSION"
    assert get_sessions(database_engine) == []


async def test_logout_deletes_only_current_session_and_returns_empty_204(
    auth_client: AsyncClient,
    database_engine: Engine,
    settings: Settings,
) -> None:
    first_token = (await login(auth_client, settings)).json()["access_token"]
    second_token = (await login(auth_client, settings)).json()["access_token"]

    logout_response = await auth_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {first_token}"},
    )
    first_me_response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {first_token}"},
    )
    second_me_response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {second_token}"},
    )

    assert logout_response.status_code == 204
    assert logout_response.content == b""
    assert len(get_sessions(database_engine)) == 1
    assert first_me_response.status_code == 401
    assert first_me_response.json()["detail"]["code"] == "INVALID_SESSION"
    assert second_me_response.status_code == 200


async def test_logout_requires_known_bearer_session(
    auth_client: AsyncClient,
) -> None:
    missing_response = await auth_client.post("/api/v1/auth/logout")
    unknown_response = await auth_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {generate_session_token()}"},
    )

    assert missing_response.status_code == 401
    assert missing_response.json()["detail"]["code"] == (
        "AUTHENTICATION_REQUIRED"
    )
    assert unknown_response.status_code == 401
    assert unknown_response.json()["detail"]["code"] == "INVALID_SESSION"


async def test_openapi_documents_authentication_schemas(
    auth_client: AsyncClient,
) -> None:
    openapi = (await auth_client.get("/api/v1/openapi.json")).json()

    assert "/api/v1/auth/login" in openapi["paths"]
    assert "/api/v1/auth/logout" in openapi["paths"]
    assert "/api/v1/auth/me" in openapi["paths"]
    assert "LoginRequest" in openapi["components"]["schemas"]
    assert "LoginResponse" in openapi["components"]["schemas"]
    assert "UserResponse" in openapi["components"]["schemas"]
    assert "OpaqueBearer" in openapi["components"]["securitySchemes"]
