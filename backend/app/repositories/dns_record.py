from collections.abc import Sequence
from typing import Literal

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session as DatabaseSession
from sqlalchemy.orm import raiseload

from app.models.dns_record import DNSRecord
from app.models.enums import DNSRecordType, RoutingPolicy

DNSRecordSortField = Literal[
    "name",
    "record_type",
    "ttl",
    "created_at",
    "updated_at",
]
SortOrder = Literal["asc", "desc"]


class DNSRecordRepository:
    def __init__(self, db: DatabaseSession) -> None:
        self._db = db

    def create(
        self,
        *,
        hosted_zone_id: str,
        name: str,
        record_type: DNSRecordType,
        values: list[str],
        ttl: int,
        routing_policy: RoutingPolicy,
        alias: bool,
    ) -> DNSRecord:
        record = DNSRecord(
            hosted_zone_id=hosted_zone_id,
            name=name,
            record_type=record_type,
            values=values,
            ttl=ttl,
            routing_policy=routing_policy,
            alias=alias,
            is_system=False,
        )
        self._db.add(record)
        self._db.flush()
        return record

    def create_many(self, records: Sequence[DNSRecord]) -> None:
        self._db.add_all(records)
        self._db.flush()

    def get_by_id_in_zone(
        self,
        *,
        hosted_zone_id: str,
        record_id: str,
    ) -> DNSRecord | None:
        statement = (
            select(DNSRecord)
            .options(raiseload("*"))
            .where(
                DNSRecord.id == record_id,
                DNSRecord.hosted_zone_id == hosted_zone_id,
            )
        )
        return self._db.scalar(statement)

    def get_by_name_and_type(
        self,
        *,
        hosted_zone_id: str,
        name: str,
        record_type: DNSRecordType,
    ) -> DNSRecord | None:
        statement = (
            select(DNSRecord)
            .options(raiseload("*"))
            .where(
                DNSRecord.hosted_zone_id == hosted_zone_id,
                DNSRecord.name == name,
                DNSRecord.record_type == record_type,
            )
        )
        return self._db.scalar(statement)

    def get_all_at_name(
        self,
        *,
        hosted_zone_id: str,
        name: str,
    ) -> list[DNSRecord]:
        statement = (
            select(DNSRecord)
            .options(raiseload("*"))
            .where(
                DNSRecord.hosted_zone_id == hosted_zone_id,
                DNSRecord.name == name,
            )
        )
        return list(self._db.scalars(statement))

    def list_in_zone(
        self,
        *,
        hosted_zone_id: str,
        search: str | None,
        record_type: DNSRecordType | None,
        routing_policy: RoutingPolicy | None,
        alias: bool | None,
        page: int,
        page_size: int,
        sort_by: DNSRecordSortField,
        sort_order: SortOrder,
    ) -> tuple[list[DNSRecord], int]:
        filters = [DNSRecord.hosted_zone_id == hosted_zone_id]
        if search is not None:
            filters.append(
                or_(
                    func.lower(DNSRecord.name).contains(
                        search,
                        autoescape=True,
                    ),
                    func.lower(cast(DNSRecord.values, String)).contains(
                        search,
                        autoescape=True,
                    ),
                )
            )
        if record_type is not None:
            filters.append(DNSRecord.record_type == record_type)
        if routing_policy is not None:
            filters.append(DNSRecord.routing_policy == routing_policy)
        if alias is not None:
            filters.append(DNSRecord.alias.is_(alias))

        total_statement = (
            select(func.count()).select_from(DNSRecord).where(*filters)
        )
        total = int(self._db.scalar(total_statement) or 0)

        sort_columns = {
            "name": DNSRecord.name,
            "record_type": DNSRecord.record_type,
            "ttl": DNSRecord.ttl,
            "created_at": DNSRecord.created_at,
            "updated_at": DNSRecord.updated_at,
        }
        sort_column = sort_columns[sort_by]
        primary_order = (
            sort_column.asc() if sort_order == "asc" else sort_column.desc()
        )
        statement = (
            select(DNSRecord)
            .options(raiseload("*"))
            .where(*filters)
            .order_by(primary_order, DNSRecord.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self._db.scalars(statement)), total

    def get_system_ns_for_zone(self, hosted_zone_id: str) -> DNSRecord | None:
        statement = (
            select(DNSRecord)
            .options(raiseload("*"))
            .where(
                DNSRecord.hosted_zone_id == hosted_zone_id,
                DNSRecord.record_type == DNSRecordType.NS,
                DNSRecord.is_system.is_(True),
            )
        )
        return self._db.scalar(statement)

    def update(
        self,
        record: DNSRecord,
        *,
        values: list[str] | None,
        ttl: int | None,
    ) -> DNSRecord:
        if values is not None:
            record.values = values
        if ttl is not None:
            record.ttl = ttl
        self._db.flush()
        return record

    def delete(self, record: DNSRecord) -> None:
        self._db.delete(record)
