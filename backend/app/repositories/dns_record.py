from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session as DatabaseSession

from app.models.dns_record import DNSRecord
from app.models.enums import DNSRecordType


class DNSRecordRepository:
    def __init__(self, db: DatabaseSession) -> None:
        self._db = db

    def create_many(self, records: Sequence[DNSRecord]) -> None:
        self._db.add_all(records)
        self._db.flush()

    def get_system_ns_for_zone(self, hosted_zone_id: str) -> DNSRecord | None:
        statement = select(DNSRecord).where(
            DNSRecord.hosted_zone_id == hosted_zone_id,
            DNSRecord.record_type == DNSRecordType.NS,
            DNSRecord.is_system.is_(True),
        )
        return self._db.scalar(statement)
