from dataclasses import dataclass

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session as DatabaseSession

from app.core.exceptions import (
    alias_not_supported_error,
    cname_conflict_error,
    dns_record_already_exists_error,
    dns_record_creation_failed_error,
    dns_record_not_found_error,
    domain_validation_error,
    hosted_zone_not_found_error,
    internal_error,
    system_record_protected_error,
)
from app.models.dns_record import DNSRecord
from app.models.enums import DNSRecordType, RoutingPolicy
from app.models.hosted_zone import HostedZone
from app.models.user import User
from app.repositories.dns_record import (
    DNSRecordRepository,
    DNSRecordSortField,
    SortOrder,
)
from app.repositories.hosted_zone import HostedZoneRepository
from app.validators.domain import normalize_search_term
from app.validators.record_name import (
    RecordNameValidationError,
    normalize_record_name,
)
from app.validators.record_value import (
    RecordValueValidationError,
    normalize_record_values,
)


@dataclass(frozen=True)
class DNSRecordPage:
    items: list[DNSRecord]
    page: int
    page_size: int
    total: int
    total_pages: int


class DNSRecordService:
    def __init__(self, db: DatabaseSession) -> None:
        self._db = db
        self._zones = HostedZoneRepository(db)
        self._records = DNSRecordRepository(db)

    def create(
        self,
        *,
        user: User,
        zone_id: str,
        name: str,
        record_type: DNSRecordType,
        values: list[str],
        ttl: int,
        routing_policy: RoutingPolicy,
        alias: bool,
    ) -> DNSRecord:
        zone = self._get_owned_zone(user=user, zone_id=zone_id)
        if alias:
            raise alias_not_supported_error()
        if record_type is DNSRecordType.SOA:
            raise domain_validation_error(
                "SOA records are managed internally and cannot be created."
            )

        canonical_name = self._normalize_name(
            name,
            zone.name,
            record_type,
        )
        if (
            record_type is DNSRecordType.CNAME
            and canonical_name == zone.name
        ):
            raise cname_conflict_error(
                "A CNAME record cannot be created at the hosted-zone apex."
            )
        normalized_values = self._normalize_values(record_type, values)

        try:
            records_at_name = self._records.get_all_at_name(
                hosted_zone_id=zone.id,
                name=canonical_name,
            )
        except SQLAlchemyError:
            self._db.rollback()
            raise dns_record_creation_failed_error() from None
        if any(
            record.record_type is record_type for record in records_at_name
        ):
            raise dns_record_already_exists_error(
                canonical_name,
                record_type.value,
            )
        if record_type is DNSRecordType.CNAME and records_at_name:
            raise cname_conflict_error(
                "A CNAME record cannot coexist with another record at "
                f"{canonical_name}"
            )
        if any(
            record.record_type is DNSRecordType.CNAME
            for record in records_at_name
        ):
            raise cname_conflict_error(
                f"Another record cannot coexist with a CNAME at {canonical_name}"
            )

        try:
            record = self._records.create(
                hosted_zone_id=zone.id,
                name=canonical_name,
                record_type=record_type,
                values=normalized_values,
                ttl=ttl,
                routing_policy=routing_policy,
                alias=False,
            )
            self._db.commit()
        except IntegrityError:
            self._db.rollback()
            raise dns_record_already_exists_error(
                canonical_name,
                record_type.value,
            ) from None
        except SQLAlchemyError:
            self._db.rollback()
            raise dns_record_creation_failed_error() from None
        except Exception:
            self._db.rollback()
            raise dns_record_creation_failed_error() from None
        return record

    def list_in_owned_zone(
        self,
        *,
        user: User,
        zone_id: str,
        search: str | None,
        record_type: DNSRecordType | None,
        routing_policy: RoutingPolicy | None,
        alias: bool | None,
        page: int,
        page_size: int,
        sort_by: DNSRecordSortField,
        sort_order: SortOrder,
    ) -> DNSRecordPage:
        zone = self._get_owned_zone(user=user, zone_id=zone_id)
        try:
            records, total = self._records.list_in_zone(
                hosted_zone_id=zone.id,
                search=normalize_search_term(search),
                record_type=record_type,
                routing_policy=routing_policy,
                alias=alias,
                page=page,
                page_size=page_size,
                sort_by=sort_by,
                sort_order=sort_order,
            )
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None
        return DNSRecordPage(
            items=records,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=(total + page_size - 1) // page_size,
        )

    def get_in_owned_zone(
        self,
        *,
        user: User,
        zone_id: str,
        record_id: str,
    ) -> DNSRecord:
        zone = self._get_owned_zone(user=user, zone_id=zone_id)
        return self._get_record(zone_id=zone.id, record_id=record_id)

    def update(
        self,
        *,
        user: User,
        zone_id: str,
        record_id: str,
        values: list[str] | None,
        ttl: int | None,
    ) -> DNSRecord:
        zone = self._get_owned_zone(user=user, zone_id=zone_id)
        record = self._get_record(zone_id=zone.id, record_id=record_id)
        if record.is_system:
            raise system_record_protected_error()
        normalized_values = (
            self._normalize_values(record.record_type, values)
            if values is not None
            else None
        )
        try:
            updated = self._records.update(
                record,
                values=normalized_values,
                ttl=ttl,
            )
            self._db.commit()
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None
        return updated

    def delete(
        self,
        *,
        user: User,
        zone_id: str,
        record_id: str,
    ) -> None:
        zone = self._get_owned_zone(user=user, zone_id=zone_id)
        record = self._get_record(zone_id=zone.id, record_id=record_id)
        if record.is_system:
            raise system_record_protected_error()
        try:
            self._records.delete(record)
            self._db.commit()
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None

    def _get_owned_zone(self, *, user: User, zone_id: str) -> HostedZone:
        try:
            zone = self._zones.get_owned_by_id(
                user_id=user.id,
                zone_id=zone_id,
            )
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None
        if zone is None:
            raise hosted_zone_not_found_error()
        return zone

    def _get_record(self, *, zone_id: str, record_id: str) -> DNSRecord:
        try:
            record = self._records.get_by_id_in_zone(
                hosted_zone_id=zone_id,
                record_id=record_id,
            )
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None
        if record is None:
            raise dns_record_not_found_error()
        return record

    @staticmethod
    def _normalize_name(
        name: str,
        zone_name: str,
        record_type: DNSRecordType,
    ) -> str:
        try:
            return normalize_record_name(name, zone_name, record_type)
        except RecordNameValidationError as exc:
            raise domain_validation_error(str(exc)) from None

    @staticmethod
    def _normalize_values(
        record_type: DNSRecordType,
        values: list[str],
    ) -> list[str]:
        try:
            return normalize_record_values(record_type, values)
        except RecordValueValidationError as exc:
            raise domain_validation_error(str(exc)) from None
