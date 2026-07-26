from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.database import Base, create_database_engine
from app.main import create_application


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
