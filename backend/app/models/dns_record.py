from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
    false,
)
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Base,
    HOSTED_ZONE_ID_LENGTH,
    TimestampMixin,
    UUID_STRING_LENGTH,
    generate_uuid,
)
from app.models.enums import (
    DNS_RECORD_TYPE_DB_ENUM,
    ROUTING_POLICY_DB_ENUM,
    DNSRecordType,
    RoutingPolicy,
)

if TYPE_CHECKING:
    from app.models.hosted_zone import HostedZone

MAX_TTL = 2_147_483_647


class DNSRecord(TimestampMixin, Base):
    __tablename__ = "dns_records"
    __table_args__ = (
        UniqueConstraint(
            "hosted_zone_id",
            "name",
            "record_type",
            name="uq_dns_records_zone_id_name_record_type",
        ),
        CheckConstraint("ttl >= 1", name="ttl_minimum"),
        CheckConstraint(f"ttl <= {MAX_TTL}", name="ttl_maximum"),
        Index("ix_dns_records_name", "name"),
        Index(
            "ix_dns_records_zone_id_name_record_type",
            "hosted_zone_id",
            "name",
            "record_type",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(UUID_STRING_LENGTH),
        primary_key=True,
        default=generate_uuid,
    )
    hosted_zone_id: Mapped[str] = mapped_column(
        String(HOSTED_ZONE_ID_LENGTH),
        ForeignKey("hosted_zones.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    record_type: Mapped[DNSRecordType] = mapped_column(
        DNS_RECORD_TYPE_DB_ENUM,
        nullable=False,
    )
    values: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(JSON),
        nullable=False,
    )
    ttl: Mapped[int] = mapped_column(Integer, nullable=False)
    routing_policy: Mapped[RoutingPolicy] = mapped_column(
        ROUTING_POLICY_DB_ENUM,
        default=RoutingPolicy.SIMPLE,
        server_default=RoutingPolicy.SIMPLE.value,
        nullable=False,
    )
    alias: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=false(),
        nullable=False,
    )
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=false(),
        nullable=False,
    )

    hosted_zone: Mapped["HostedZone"] = relationship(
        back_populates="records",
        lazy="selectin",
    )
