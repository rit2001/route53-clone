from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.config import Settings
from app.core.database import Base, create_database_engine
from app.main import create_application
from app.seed import seed_demo_user


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def settings() -> Settings:
    return Settings(_env_file=None)


@pytest.fixture
async def client(settings: Settings) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=create_application(settings))
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as test_client:
        yield test_client


@pytest.fixture
def database_engine(tmp_path: Path) -> Iterator[Engine]:
    database_path = tmp_path / "route53-test.db"
    test_engine = create_database_engine(f"sqlite:///{database_path}")
    Base.metadata.create_all(test_engine)
    try:
        yield test_engine
    finally:
        test_engine.dispose()


@pytest.fixture
def db_session(database_engine: Engine) -> Iterator[Session]:
    with Session(database_engine, expire_on_commit=False) as session:
        yield session
        session.rollback()


@pytest.fixture
async def auth_client(
    database_engine: Engine,
    settings: Settings,
) -> AsyncIterator[AsyncClient]:
    with Session(database_engine, expire_on_commit=False) as seed_session:
        seed_demo_user(seed_session, settings)

    application = create_application(settings)

    def override_get_db() -> Iterator[Session]:
        with Session(database_engine, expire_on_commit=False) as session:
            try:
                yield session
            except Exception:
                session.rollback()
                raise

    application.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=application)
    try:
        async with AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as test_client:
            yield test_client
    finally:
        application.dependency_overrides.clear()
