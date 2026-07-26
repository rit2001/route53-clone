from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.api.dependencies import (
    get_authenticated_session,
    get_authentication_service,
    get_current_user,
)
from app.models.user import User
from app.schemas.auth import (
    ErrorResponse,
    LoginRequest,
    LoginResponse,
    UserResponse,
)
from app.services.auth import AuthenticatedSession, AuthenticationService

router = APIRouter(prefix="/auth", tags=["authentication"])

AUTH_ERROR_RESPONSE = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorResponse,
        "description": "Authentication failed.",
    }
}


@router.post(
    "/login",
    response_model=LoginResponse,
    responses=AUTH_ERROR_RESPONSE,
    summary="Create an opaque session",
)
def login(
    request: LoginRequest,
    service: Annotated[
        AuthenticationService,
        Depends(get_authentication_service),
    ],
) -> LoginResponse:
    result = service.login(request.email, request.password)
    return LoginResponse(
        access_token=result.access_token,
        expires_at=result.auth_session.expires_at,
        user=UserResponse.model_validate(result.user),
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses=AUTH_ERROR_RESPONSE,
    summary="Delete the current session",
)
def logout(
    authenticated: Annotated[
        AuthenticatedSession,
        Depends(get_authenticated_session),
    ],
    service: Annotated[
        AuthenticationService,
        Depends(get_authentication_service),
    ],
) -> Response:
    service.logout(authenticated)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/me",
    response_model=UserResponse,
    responses=AUTH_ERROR_RESPONSE,
    summary="Return the current user",
)
def get_me(
    user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(user)
