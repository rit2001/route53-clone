from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request, Response, status

from app.api.dependencies import get_current_user, get_hosted_zone_service
from app.models.enums import HostedZoneType
from app.models.user import User
from app.schemas.auth import ErrorResponse
from app.schemas.hosted_zone import (
    HostedZoneCreate,
    HostedZoneDetail,
    HostedZoneListResponse,
    HostedZoneUpdate,
)
from app.services.hosted_zone import HostedZoneService

router = APIRouter(prefix="/hosted-zones", tags=["hosted zones"])

AUTH_RESPONSE = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorResponse,
        "description": "Authentication failed.",
    }
}
NOT_FOUND_RESPONSE = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorResponse,
        "description": "Hosted zone not found.",
    }
}


@router.get(
    "",
    response_model=HostedZoneListResponse,
    responses=AUTH_RESPONSE,
    summary="List owned hosted zones",
)
def list_hosted_zones(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[HostedZoneService, Depends(get_hosted_zone_service)],
    search: Annotated[str | None, Query(max_length=256)] = None,
    zone_type: HostedZoneType | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    sort_by: Literal["name", "zone_type", "created_at", "updated_at"] = "name",
    sort_order: Literal["asc", "desc"] = "asc",
) -> HostedZoneListResponse:
    result = service.list_owned(
        user=user,
        search=search,
        zone_type=zone_type,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return HostedZoneListResponse.model_validate(result)


@router.post(
    "",
    response_model=HostedZoneDetail,
    status_code=status.HTTP_201_CREATED,
    responses={
        **AUTH_RESPONSE,
        status.HTTP_409_CONFLICT: {
            "model": ErrorResponse,
            "description": "Hosted zone already exists.",
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorResponse,
            "description": "Hosted zone creation failed safely.",
        },
    },
    summary="Create a hosted zone",
)
def create_hosted_zone(
    request: HostedZoneCreate,
    http_request: Request,
    response: Response,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[HostedZoneService, Depends(get_hosted_zone_service)],
) -> HostedZoneDetail:
    result = service.create(
        user=user,
        name=request.name,
        comment=request.comment,
        zone_type=request.zone_type,
    )
    response.headers["Location"] = str(
        http_request.url_for("get_hosted_zone", zone_id=result.id)
    )
    return HostedZoneDetail.model_validate(result)


@router.get(
    "/{zone_id}",
    response_model=HostedZoneDetail,
    responses={**AUTH_RESPONSE, **NOT_FOUND_RESPONSE},
    summary="Get an owned hosted zone",
)
def get_hosted_zone(
    zone_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[HostedZoneService, Depends(get_hosted_zone_service)],
) -> HostedZoneDetail:
    result = service.get_owned(user=user, zone_id=zone_id)
    return HostedZoneDetail.model_validate(result)


@router.patch(
    "/{zone_id}",
    response_model=HostedZoneDetail,
    responses={**AUTH_RESPONSE, **NOT_FOUND_RESPONSE},
    summary="Update an owned hosted-zone comment",
)
def update_hosted_zone(
    zone_id: str,
    request: HostedZoneUpdate,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[HostedZoneService, Depends(get_hosted_zone_service)],
) -> HostedZoneDetail:
    result = service.update_comment(
        user=user,
        zone_id=zone_id,
        comment=request.comment,
    )
    return HostedZoneDetail.model_validate(result)


@router.delete(
    "/{zone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses={**AUTH_RESPONSE, **NOT_FOUND_RESPONSE},
    summary="Delete an owned hosted zone",
)
def delete_hosted_zone(
    zone_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[HostedZoneService, Depends(get_hosted_zone_service)],
) -> Response:
    service.delete(user=user, zone_id=zone_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
