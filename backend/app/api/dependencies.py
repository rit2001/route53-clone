from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import SessionLocal
from app.core.exceptions import (
    authentication_required_error,
    invalid_session_error,
)
from app.models.user import User
from app.services.auth import AuthenticatedSession, AuthenticationService

bearer_scheme = HTTPBearer(
    auto_error=False,
    scheme_name="OpaqueBearer",
    description="Opaque session token returned by the login endpoint.",
)


def get_db() -> Generator[Session, None, None]:
    """Provide one SQLAlchemy session per request."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_authentication_service(
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthenticationService:
    return AuthenticationService(db, settings)


def get_bearer_token(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    if authorization is None:
        raise authentication_required_error()
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise invalid_session_error()
    return credentials.credentials


def get_authenticated_session(
    raw_token: Annotated[str, Depends(get_bearer_token)],
    service: Annotated[
        AuthenticationService,
        Depends(get_authentication_service),
    ],
) -> AuthenticatedSession:
    return service.resolve_session(raw_token)


def get_current_user(
    authenticated: Annotated[
        AuthenticatedSession,
        Depends(get_authenticated_session),
    ],
) -> User:
    return authenticated.user
