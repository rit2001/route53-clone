from sqlalchemy import text
from sqlalchemy.engine import Engine


def test_sqlite_foreign_keys_are_enabled(database_engine: Engine) -> None:
    with database_engine.connect() as connection:
        enabled = connection.execute(text("PRAGMA foreign_keys")).scalar_one()

    assert enabled == 1
