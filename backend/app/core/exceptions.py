from dataclasses import dataclass, field

from fastapi import status

BEARER_AUTH_HEADER = {"WWW-Authenticate": "Bearer"}


@dataclass
class APIError(Exception):
    status_code: int
    code: str
    message: str
    headers: dict[str, str] = field(default_factory=dict)


def invalid_credentials_error() -> APIError:
    return APIError(
        status_code=status.HTTP_401_UNAUTHORIZED,
        code="INVALID_CREDENTIALS",
        message="The email or password is incorrect.",
        headers=BEARER_AUTH_HEADER.copy(),
    )


def authentication_required_error() -> APIError:
    return APIError(
        status_code=status.HTTP_401_UNAUTHORIZED,
        code="AUTHENTICATION_REQUIRED",
        message="Authentication credentials were not provided.",
        headers=BEARER_AUTH_HEADER.copy(),
    )


def invalid_session_error() -> APIError:
    return APIError(
        status_code=status.HTTP_401_UNAUTHORIZED,
        code="INVALID_SESSION",
        message="The session token is invalid.",
        headers=BEARER_AUTH_HEADER.copy(),
    )


def session_expired_error() -> APIError:
    return APIError(
        status_code=status.HTTP_401_UNAUTHORIZED,
        code="SESSION_EXPIRED",
        message="The session has expired.",
        headers=BEARER_AUTH_HEADER.copy(),
    )


def internal_error() -> APIError:
    return APIError(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="INTERNAL_ERROR",
        message="An unexpected server error occurred.",
    )
