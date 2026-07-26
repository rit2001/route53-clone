from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

BUSINESS_TABLES = {"users", "sessions", "hosted_zones", "dns_records"}

EXPECTED_INDEXES = {
    "users": {"ix_users_email"},
    "sessions": {"ix_sessions_expires_at", "ix_sessions_token_hash"},
    "hosted_zones": {
        "ix_hosted_zones_name",
        "ix_hosted_zones_user_id_name",
    },
    "dns_records": {
        "ix_dns_records_name",
        "ix_dns_records_zone_id_name_record_type",
    },
}

EXPECTED_UNIQUE_CONSTRAINTS = {
    "users": {"uq_users_email"},
    "sessions": {"uq_sessions_token_hash"},
    "hosted_zones": {"uq_hosted_zones_user_id_name_zone_type"},
    "dns_records": {"uq_dns_records_zone_id_name_record_type"},
}

EXPECTED_PRIMARY_KEYS = {
    "users": "pk_users",
    "sessions": "pk_sessions",
    "hosted_zones": "pk_hosted_zones",
    "dns_records": "pk_dns_records",
}


def make_alembic_config(database_url: str) -> Config:
    backend_directory = Path(__file__).resolve().parents[1]
    config = Config(str(backend_directory / "alembic.ini"))
    config.attributes["database_url"] = database_url
    return config


def test_migration_upgrade_downgrade_and_schema(
    tmp_path: Path,
) -> None:
    database_path = tmp_path / "migration-test.db"
    database_url = f"sqlite:///{database_path}"
    config = make_alembic_config(database_url)

    command.upgrade(config, "head")

    engine = create_engine(database_url)
    try:
        inspector = inspect(engine)
        assert BUSINESS_TABLES.issubset(inspector.get_table_names())

        for table_name, expected_indexes in EXPECTED_INDEXES.items():
            actual_indexes = {
                index["name"] for index in inspector.get_indexes(table_name)
            }
            assert expected_indexes.issubset(actual_indexes)

        for table_name, expected_constraints in (
            EXPECTED_UNIQUE_CONSTRAINTS.items()
        ):
            actual_constraints = {
                constraint["name"]
                for constraint in inspector.get_unique_constraints(table_name)
            }
            assert expected_constraints.issubset(actual_constraints)

        for table_name, expected_primary_key in EXPECTED_PRIMARY_KEYS.items():
            primary_key = inspector.get_pk_constraint(table_name)
            assert primary_key["name"] == expected_primary_key

        zone_checks = {
            constraint["name"]
            for constraint in inspector.get_check_constraints("hosted_zones")
        }
        assert "ck_hosted_zones_hosted_zone_type" in zone_checks

        dns_checks = {
            constraint["name"]
            for constraint in inspector.get_check_constraints("dns_records")
        }
        assert {
            "ck_dns_records_dns_record_type",
            "ck_dns_records_routing_policy",
            "ck_dns_records_ttl_maximum",
            "ck_dns_records_ttl_minimum",
        }.issubset(dns_checks)

        for table_name in ("sessions", "hosted_zones", "dns_records"):
            foreign_keys = inspector.get_foreign_keys(table_name)
            assert len(foreign_keys) == 1
            assert foreign_keys[0]["options"]["ondelete"] == "CASCADE"
    finally:
        engine.dispose()

    command.downgrade(config, "base")

    downgraded_engine = create_engine(database_url)
    try:
        assert BUSINESS_TABLES.isdisjoint(
            inspect(downgraded_engine).get_table_names()
        )
    finally:
        downgraded_engine.dispose()

    command.upgrade(config, "head")
    command.check(config)
