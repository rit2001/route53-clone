from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Base,
    HOSTED_ZONE_ID_LENGTH,
    TimestampMixin,
    UUID_STRING_LENGTH,
    generate_hosted_zone_id,
)
from app.models.enums import HOSTED_ZONE_TYPE_DB_ENUM, HostedZoneType

if TYPE_CHECKING:
    from app.models.dns_record import DNSRecord
    from app.models.user import User


class HostedZone(TimestampMixin, Base):
    __tablename__ = "hosted_zones"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "name",
            "zone_type",
            name="uq_hosted_zones_user_id_name_zone_type",
        ),
        Index("ix_hosted_zones_name", "name"),
        Index("ix_hosted_zones_user_id_name", "user_id", "name"),
    )

    id: Mapped[str] = mapped_column(
        String(HOSTED_ZONE_ID_LENGTH),
        primary_key=True,
        default=generate_hosted_zone_id,
    )
    user_id: Mapped[str] = mapped_column(
        String(UUID_STRING_LENGTH),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    zone_type: Mapped[HostedZoneType] = mapped_column(
        HOSTED_ZONE_TYPE_DB_ENUM,
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        back_populates="hosted_zones",
        lazy="selectin",
    )
    records: Mapped[list["DNSRecord"]] = relationship(
        back_populates="hosted_zone",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )
