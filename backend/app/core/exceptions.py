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


def hosted_zone_not_found_error() -> APIError:
    return APIError(
        status_code=status.HTTP_404_NOT_FOUND,
        code="HOSTED_ZONE_NOT_FOUND",
        message="The hosted zone was not found.",
    )


def hosted_zone_already_exists_error(
    name: str,
    zone_type: str,
) -> APIError:
    return APIError(
        status_code=status.HTTP_409_CONFLICT,
        code="HOSTED_ZONE_ALREADY_EXISTS",
        message=f"A {zone_type} hosted zone already exists for {name}",
    )


def hosted_zone_creation_failed_error() -> APIError:
    return APIError(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="HOSTED_ZONE_CREATION_FAILED",
        message="The hosted zone could not be created.",
    )


def domain_validation_error(message: str) -> APIError:
    return APIError(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        code="VALIDATION_ERROR",
        message=message,
    )


def dns_record_not_found_error() -> APIError:
    return APIError(
        status_code=status.HTTP_404_NOT_FOUND,
        code="DNS_RECORD_NOT_FOUND",
        message="The DNS record was not found.",
    )


def dns_record_already_exists_error(
    name: str,
    record_type: str,
) -> APIError:
    return APIError(
        status_code=status.HTTP_409_CONFLICT,
        code="DNS_RECORD_ALREADY_EXISTS",
        message=f"An {record_type} record already exists for {name}",
    )


def cname_conflict_error(message: str) -> APIError:
    return APIError(
        status_code=status.HTTP_409_CONFLICT,
        code="CNAME_CONFLICT",
        message=message,
    )


def system_record_protected_error() -> APIError:
    return APIError(
        status_code=status.HTTP_409_CONFLICT,
        code="SYSTEM_RECORD_PROTECTED",
        message="System-generated NS and SOA records cannot be modified.",
    )


def alias_not_supported_error() -> APIError:
    return APIError(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        code="ALIAS_NOT_SUPPORTED",
        message="Alias records are not supported in this assignment.",
    )


def dns_record_creation_failed_error() -> APIError:
    return APIError(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="DNS_RECORD_CREATION_FAILED",
        message="The DNS record could not be created.",
    )
