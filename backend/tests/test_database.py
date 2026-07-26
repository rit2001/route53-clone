from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.core.database import SQLITE_BUSY_TIMEOUT_MILLISECONDS


def test_sqlite_foreign_keys_are_enabled(database_engine: Engine) -> None:
    with database_engine.connect() as connection:
        enabled = connection.execute(text("PRAGMA foreign_keys")).scalar_one()

    assert enabled == 1


def test_sqlite_uses_a_bounded_busy_timeout(database_engine: Engine) -> None:
    with database_engine.connect() as connection:
        busy_timeout = connection.execute(text("PRAGMA busy_timeout")).scalar_one()

    assert busy_timeout == SQLITE_BUSY_TIMEOUT_MILLISECONDS


def test_file_backed_sqlite_uses_wal_journal_mode(
    database_engine: Engine,
) -> None:
    with database_engine.connect() as connection:
        journal_mode = connection.execute(text("PRAGMA journal_mode")).scalar_one()

    assert journal_mode == "wal"
