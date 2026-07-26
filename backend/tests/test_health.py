import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


async def test_root_endpoint(client: AsyncClient) -> None:
    response = await client.get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == {
        "name": "Route53 Clone API",
        "status": "available",
        "docs_url": "/docs",
    }


async def test_health_endpoint_matches_contract(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "route53-clone-api",
        "environment": "development",
    }


async def test_health_response_is_documented(client: AsyncClient) -> None:
    response_schema = (await client.get("/api/v1/openapi.json")).json()["components"][
        "schemas"
    ]["HealthResponse"]

    assert response_schema["required"] == ["status", "service", "environment"]
    assert set(response_schema["properties"]) == {
        "status",
        "service",
        "environment",
    }


async def test_cors_allows_configured_frontend(client: AsyncClient) -> None:
    response = await client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == (
        "http://localhost:3000"
    )
    assert response.headers["access-control-allow-credentials"] == "true"
