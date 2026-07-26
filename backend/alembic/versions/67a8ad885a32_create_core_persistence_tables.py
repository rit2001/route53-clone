"""create core persistence tables

Revision ID: 67a8ad885a32
Revises:
Create Date: 2026-07-26 16:09:59.916251
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "67a8ad885a32"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_table(
        "hosted_zones",
        sa.Column("id", sa.String(length=21), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "zone_type",
            sa.Enum(
                "PUBLIC",
                "PRIVATE",
                name="hosted_zone_type",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_hosted_zones_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_hosted_zones")),
        sa.UniqueConstraint(
            "user_id",
            "name",
            "zone_type",
            name="uq_hosted_zones_user_id_name_zone_type",
        ),
    )
    op.create_index(
        "ix_hosted_zones_name",
        "hosted_zones",
        ["name"],
        unique=False,
    )
    op.create_index(
        "ix_hosted_zones_user_id_name",
        "hosted_zones",
        ["user_id", "name"],
        unique=False,
    )
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_sessions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sessions")),
        sa.UniqueConstraint("token_hash", name="uq_sessions_token_hash"),
    )
    op.create_index(
        "ix_sessions_expires_at",
        "sessions",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_sessions_token_hash",
        "sessions",
        ["token_hash"],
        unique=False,
    )
    op.create_table(
        "dns_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("hosted_zone_id", sa.String(length=21), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "record_type",
            sa.Enum(
                "A",
                "AAAA",
                "CNAME",
                "TXT",
                "MX",
                "NS",
                "PTR",
                "SRV",
                "CAA",
                "SOA",
                name="dns_record_type",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column("values", sa.JSON(), nullable=False),
        sa.Column("ttl", sa.Integer(), nullable=False),
        sa.Column(
            "routing_policy",
            sa.Enum(
                "SIMPLE",
                name="routing_policy",
                native_enum=False,
                create_constraint=True,
            ),
            server_default="SIMPLE",
            nullable=False,
        ),
        sa.Column(
            "alias",
            sa.Boolean(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "is_system",
            sa.Boolean(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "ttl <= 2147483647",
            name=op.f("ck_dns_records_ttl_maximum"),
        ),
        sa.CheckConstraint(
            "ttl >= 1",
            name=op.f("ck_dns_records_ttl_minimum"),
        ),
        sa.ForeignKeyConstraint(
            ["hosted_zone_id"],
            ["hosted_zones.id"],
            name=op.f("fk_dns_records_hosted_zone_id_hosted_zones"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_dns_records")),
        sa.UniqueConstraint(
            "hosted_zone_id",
            "name",
            "record_type",
            name="uq_dns_records_zone_id_name_record_type",
        ),
    )
    op.create_index(
        "ix_dns_records_name",
        "dns_records",
        ["name"],
        unique=False,
    )
    op.create_index(
        "ix_dns_records_zone_id_name_record_type",
        "dns_records",
        ["hosted_zone_id", "name", "record_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_dns_records_zone_id_name_record_type",
        table_name="dns_records",
    )
    op.drop_index("ix_dns_records_name", table_name="dns_records")
    op.drop_table("dns_records")
    op.drop_index("ix_sessions_token_hash", table_name="sessions")
    op.drop_index("ix_sessions_expires_at", table_name="sessions")
    op.drop_table("sessions")
    op.drop_index("ix_hosted_zones_user_id_name", table_name="hosted_zones")
    op.drop_index("ix_hosted_zones_name", table_name="hosted_zones")
    op.drop_table("hosted_zones")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
