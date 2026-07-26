from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request, Response, status

from app.api.dependencies import get_current_user, get_dns_record_service
from app.models.enums import DNSRecordType, RoutingPolicy
from app.models.user import User
from app.schemas.auth import ErrorResponse
from app.schemas.dns_record import (
    DNSRecordCreate,
    DNSRecordListResponse,
    DNSRecordResponse,
    DNSRecordUpdate,
)
from app.services.dns_record import DNSRecordService

router = APIRouter(
    prefix="/hosted-zones/{zone_id}/records",
    tags=["DNS records"],
)

AUTH_RESPONSE = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorResponse,
        "description": "Authentication failed.",
    }
}
NOT_FOUND_RESPONSE = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorResponse,
        "description": "Hosted zone or DNS record not found.",
    }
}
CONFLICT_RESPONSE = {
    status.HTTP_409_CONFLICT: {
        "model": ErrorResponse,
        "description": "Duplicate, CNAME conflict, or protected system record.",
    }
}


@router.get(
    "",
    response_model=DNSRecordListResponse,
    responses={**AUTH_RESPONSE, **NOT_FOUND_RESPONSE},
    summary="List records in an owned hosted zone",
)
def list_dns_records(
    zone_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[DNSRecordService, Depends(get_dns_record_service)],
    search: Annotated[str | None, Query(max_length=2_048)] = None,
    record_type: DNSRecordType | None = None,
    routing_policy: RoutingPolicy | None = None,
    alias: bool | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
    sort_by: Literal[
        "name",
        "record_type",
        "ttl",
        "created_at",
        "updated_at",
    ] = "name",
    sort_order: Literal["asc", "desc"] = "asc",
) -> DNSRecordListResponse:
    result = service.list_in_owned_zone(
        user=user,
        zone_id=zone_id,
        search=search,
        record_type=record_type,
        routing_policy=routing_policy,
        alias=alias,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return DNSRecordListResponse.model_validate(result)


@router.post(
    "",
    response_model=DNSRecordResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        **AUTH_RESPONSE,
        **NOT_FOUND_RESPONSE,
        **CONFLICT_RESPONSE,
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorResponse,
            "description": "DNS record creation failed safely.",
        },
    },
    summary="Create a validated DNS record set",
)
def create_dns_record(
    zone_id: str,
    request: DNSRecordCreate,
    http_request: Request,
    response: Response,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[DNSRecordService, Depends(get_dns_record_service)],
) -> DNSRecordResponse:
    record = service.create(
        user=user,
        zone_id=zone_id,
        name=request.name,
        record_type=DNSRecordType(request.record_type.value),
        values=request.values,
        ttl=request.ttl,
        routing_policy=request.routing_policy,
        alias=request.alias,
    )
    response.headers["Location"] = str(
        http_request.url_for(
            "get_dns_record",
            zone_id=zone_id,
            record_id=record.id,
        )
    )
    return DNSRecordResponse.model_validate(record)


@router.get(
    "/{record_id}",
    response_model=DNSRecordResponse,
    responses={**AUTH_RESPONSE, **NOT_FOUND_RESPONSE},
    summary="Get a record from an owned hosted zone",
)
def get_dns_record(
    zone_id: str,
    record_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[DNSRecordService, Depends(get_dns_record_service)],
) -> DNSRecordResponse:
    record = service.get_in_owned_zone(
        user=user,
        zone_id=zone_id,
        record_id=record_id,
    )
    return DNSRecordResponse.model_validate(record)


@router.patch(
    "/{record_id}",
    response_model=DNSRecordResponse,
    responses={
        **AUTH_RESPONSE,
        **NOT_FOUND_RESPONSE,
        **CONFLICT_RESPONSE,
    },
    summary="Update values or TTL for a user-managed record",
)
def update_dns_record(
    zone_id: str,
    record_id: str,
    request: DNSRecordUpdate,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[DNSRecordService, Depends(get_dns_record_service)],
) -> DNSRecordResponse:
    record = service.update(
        user=user,
        zone_id=zone_id,
        record_id=record_id,
        values=request.values,
        ttl=request.ttl,
    )
    return DNSRecordResponse.model_validate(record)


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses={
        **AUTH_RESPONSE,
        **NOT_FOUND_RESPONSE,
        **CONFLICT_RESPONSE,
    },
    summary="Delete a user-managed DNS record",
)
def delete_dns_record(
    zone_id: str,
    record_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[DNSRecordService, Depends(get_dns_record_service)],
) -> Response:
    service.delete(user=user, zone_id=zone_id, record_id=record_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
