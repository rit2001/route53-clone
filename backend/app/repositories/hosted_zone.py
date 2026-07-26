from dataclasses import dataclass
from typing import Literal

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session as DatabaseSession
from sqlalchemy.orm import raiseload

from app.models.dns_record import DNSRecord
from app.models.enums import HostedZoneType
from app.models.hosted_zone import HostedZone

HostedZoneSortField = Literal["name", "zone_type", "created_at", "updated_at"]
SortOrder = Literal["asc", "desc"]


@dataclass(frozen=True)
class HostedZoneWithRecordCount:
    zone: HostedZone
    record_count: int


class HostedZoneRepository:
    def __init__(self, db: DatabaseSession) -> None:
        self._db = db

    def create(
        self,
        *,
        user_id: str,
        name: str,
        comment: str | None,
        zone_type: HostedZoneType,
    ) -> HostedZone:
        zone = HostedZone(
            user_id=user_id,
            name=name,
            comment=comment,
            zone_type=zone_type,
        )
        self._db.add(zone)
        self._db.flush()
        return zone

    def get_owned_by_name_and_type(
        self,
        *,
        user_id: str,
        name: str,
        zone_type: HostedZoneType,
    ) -> HostedZone | None:
        statement = (
            select(HostedZone)
            .options(raiseload("*"))
            .where(
                HostedZone.user_id == user_id,
                HostedZone.name == name,
                HostedZone.zone_type == zone_type,
            )
        )
        return self._db.scalar(statement)

    def get_owned_by_id(
        self,
        *,
        user_id: str,
        zone_id: str,
    ) -> HostedZone | None:
        statement = (
            select(HostedZone)
            .options(raiseload("*"))
            .where(
                HostedZone.id == zone_id,
                HostedZone.user_id == user_id,
            )
        )
        return self._db.scalar(statement)

    def get_owned_with_record_count(
        self,
        *,
        user_id: str,
        zone_id: str,
    ) -> HostedZoneWithRecordCount | None:
        statement = (
            select(HostedZone, func.count(DNSRecord.id))
            .options(raiseload("*"))
            .outerjoin(
                DNSRecord,
                DNSRecord.hosted_zone_id == HostedZone.id,
            )
            .where(
                HostedZone.id == zone_id,
                HostedZone.user_id == user_id,
            )
            .group_by(HostedZone.id)
        )
        row = self._db.execute(statement).one_or_none()
        if row is None:
            return None
        return HostedZoneWithRecordCount(
            zone=row[0],
            record_count=int(row[1]),
        )

    def list_owned_with_record_counts(
        self,
        *,
        user_id: str,
        search: str | None,
        zone_type: HostedZoneType | None,
        page: int,
        page_size: int,
        sort_by: HostedZoneSortField,
        sort_order: SortOrder,
    ) -> tuple[list[HostedZoneWithRecordCount], int]:
        filters = [HostedZone.user_id == user_id]
        if search is not None:
            filters.append(
                or_(
                    func.lower(HostedZone.name).contains(
                        search,
                        autoescape=True,
                    ),
                    func.lower(HostedZone.comment).contains(
                        search,
                        autoescape=True,
                    ),
                )
            )
        if zone_type is not None:
            filters.append(HostedZone.zone_type == zone_type)

        total_statement = (
            select(func.count()).select_from(HostedZone).where(*filters)
        )
        total = int(self._db.scalar(total_statement) or 0)

        sort_columns = {
            "name": HostedZone.name,
            "zone_type": HostedZone.zone_type,
            "created_at": HostedZone.created_at,
            "updated_at": HostedZone.updated_at,
        }
        sort_column = sort_columns[sort_by]
        primary_order = (
            sort_column.asc() if sort_order == "asc" else sort_column.desc()
        )
        statement: Select[tuple[HostedZone, int]] = (
            select(HostedZone, func.count(DNSRecord.id))
            .options(raiseload("*"))
            .outerjoin(
                DNSRecord,
                DNSRecord.hosted_zone_id == HostedZone.id,
            )
            .where(*filters)
            .group_by(HostedZone.id)
            .order_by(primary_order, HostedZone.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = self._db.execute(statement).all()
        items = [
            HostedZoneWithRecordCount(zone=row[0], record_count=int(row[1]))
            for row in rows
        ]
        return items, total

    def update_comment(
        self,
        zone: HostedZone,
        comment: str | None,
    ) -> HostedZone:
        zone.comment = comment
        self._db.flush()
        return zone

    def delete(self, zone: HostedZone) -> None:
        self._db.delete(zone)
