from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session as DatabaseSession

from app.core.exceptions import (
    domain_validation_error,
    hosted_zone_already_exists_error,
    hosted_zone_creation_failed_error,
    hosted_zone_not_found_error,
    internal_error,
)
from app.models.enums import HostedZoneType
from app.models.hosted_zone import HostedZone
from app.models.user import User
from app.repositories.dns_record import DNSRecordRepository
from app.repositories.hosted_zone import (
    HostedZoneRepository,
    HostedZoneSortField,
    HostedZoneWithRecordCount,
    SortOrder,
)
from app.services.system_records import generate_public_zone_system_records
from app.validators.domain import (
    DomainNameValidationError,
    normalize_domain_name,
    normalize_search_term,
)


@dataclass(frozen=True)
class HostedZoneView:
    id: str
    name: str
    comment: str | None
    zone_type: HostedZoneType
    record_count: int
    created_at: datetime
    updated_at: datetime
    name_servers: list[str]


@dataclass(frozen=True)
class HostedZonePage:
    items: list[HostedZoneView]
    page: int
    page_size: int
    total: int
    total_pages: int


class HostedZoneService:
    def __init__(self, db: DatabaseSession) -> None:
        self._db = db
        self._zones = HostedZoneRepository(db)
        self._records = DNSRecordRepository(db)

    def create(
        self,
        *,
        user: User,
        name: str,
        comment: str | None,
        zone_type: HostedZoneType,
    ) -> HostedZoneView:
        canonical_name = self._normalize_domain(name)
        normalized_comment = self._normalize_comment(comment)

        try:
            existing = self._zones.get_owned_by_name_and_type(
                user_id=user.id,
                name=canonical_name,
                zone_type=zone_type,
            )
        except SQLAlchemyError:
            self._db.rollback()
            raise hosted_zone_creation_failed_error() from None
        if existing is not None:
            raise hosted_zone_already_exists_error(
                canonical_name,
                zone_type.value,
            )

        name_servers: list[str] = []
        record_count = 0
        try:
            zone = self._zones.create(
                user_id=user.id,
                name=canonical_name,
                comment=normalized_comment,
                zone_type=zone_type,
            )
            if zone_type is HostedZoneType.PUBLIC:
                system_records = generate_public_zone_system_records(
                    zone.id,
                    canonical_name,
                )
                self._records.create_many(system_records)
                name_servers = list(system_records[0].values)
                record_count = len(system_records)
            self._db.commit()
        except IntegrityError:
            self._db.rollback()
            raise hosted_zone_already_exists_error(
                canonical_name,
                zone_type.value,
            ) from None
        except SQLAlchemyError:
            self._db.rollback()
            raise hosted_zone_creation_failed_error() from None
        except Exception:
            self._db.rollback()
            raise hosted_zone_creation_failed_error() from None

        return self._view(
            zone,
            record_count=record_count,
            name_servers=name_servers,
        )

    def list_owned(
        self,
        *,
        user: User,
        search: str | None,
        zone_type: HostedZoneType | None,
        page: int,
        page_size: int,
        sort_by: HostedZoneSortField,
        sort_order: SortOrder,
    ) -> HostedZonePage:
        try:
            rows, total = self._zones.list_owned_with_record_counts(
                user_id=user.id,
                search=normalize_search_term(search),
                zone_type=zone_type,
                page=page,
                page_size=page_size,
                sort_by=sort_by,
                sort_order=sort_order,
            )
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None
        return HostedZonePage(
            items=[self._view_from_row(row) for row in rows],
            page=page,
            page_size=page_size,
            total=total,
            total_pages=(total + page_size - 1) // page_size,
        )

    def get_owned(self, *, user: User, zone_id: str) -> HostedZoneView:
        row = self._get_owned_row(user=user, zone_id=zone_id)
        try:
            ns_record = self._records.get_system_ns_for_zone(row.zone.id)
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None
        return self._view_from_row(
            row,
            name_servers=list(ns_record.values) if ns_record is not None else [],
        )

    def update_comment(
        self,
        *,
        user: User,
        zone_id: str,
        comment: str | None,
    ) -> HostedZoneView:
        row = self._get_owned_row(user=user, zone_id=zone_id)
        try:
            ns_record = self._records.get_system_ns_for_zone(row.zone.id)
            zone = self._zones.update_comment(
                row.zone,
                self._normalize_comment(comment),
            )
            self._db.commit()
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None
        return self._view(
            zone,
            record_count=row.record_count,
            name_servers=(
                list(ns_record.values) if ns_record is not None else []
            ),
        )

    def delete(self, *, user: User, zone_id: str) -> None:
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
        try:
            self._zones.delete(zone)
            self._db.commit()
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None

    def _get_owned_row(
        self,
        *,
        user: User,
        zone_id: str,
    ) -> HostedZoneWithRecordCount:
        try:
            row = self._zones.get_owned_with_record_count(
                user_id=user.id,
                zone_id=zone_id,
            )
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None
        if row is None:
            raise hosted_zone_not_found_error()
        return row

    @staticmethod
    def _normalize_domain(name: str) -> str:
        try:
            return normalize_domain_name(name)
        except DomainNameValidationError as exc:
            raise domain_validation_error(str(exc)) from None

    @staticmethod
    def _normalize_comment(comment: str | None) -> str | None:
        if comment is None:
            return None
        normalized = comment.strip()
        return normalized or None

    @staticmethod
    def _view(
        zone: HostedZone,
        *,
        record_count: int,
        name_servers: list[str],
    ) -> HostedZoneView:
        return HostedZoneView(
            id=zone.id,
            name=zone.name,
            comment=zone.comment,
            zone_type=zone.zone_type,
            record_count=record_count,
            created_at=zone.created_at,
            updated_at=zone.updated_at,
            name_servers=name_servers,
        )

    @classmethod
    def _view_from_row(
        cls,
        row: HostedZoneWithRecordCount,
        *,
        name_servers: list[str] | None = None,
    ) -> HostedZoneView:
        return cls._view(
            row.zone,
            record_count=row.record_count,
            name_servers=name_servers or [],
        )
