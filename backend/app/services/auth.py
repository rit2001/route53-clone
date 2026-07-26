from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session as DatabaseSession

from app.core.config import Settings
from app.core.exceptions import (
    internal_error,
    invalid_credentials_error,
    invalid_session_error,
    session_expired_error,
)
from app.core.security import (
    generate_session_token,
    hash_session_token,
    is_plausible_session_token,
    normalize_email,
    verify_password,
)
from app.models.base import utc_now
from app.models.session import Session
from app.models.user import User
from app.repositories.session import SessionRepository
from app.repositories.user import UserRepository


@dataclass(frozen=True)
class LoginResult:
    access_token: str
    auth_session: Session
    user: User


@dataclass(frozen=True)
class AuthenticatedSession:
    auth_session: Session
    user: User


class AuthenticationService:
    def __init__(
        self,
        db: DatabaseSession,
        settings: Settings,
        *,
        now_provider: Callable[[], datetime] = utc_now,
    ) -> None:
        self._db = db
        self._settings = settings
        self._now_provider = now_provider
        self._users = UserRepository(db)
        self._sessions = SessionRepository(db)

    def login(self, email: str, password: str) -> LoginResult:
        try:
            user = self._users.get_by_email(normalize_email(email))
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None

        if user is None or not verify_password(password, user.password_hash):
            raise invalid_credentials_error()

        raw_token = generate_session_token()
        expires_at = self._now_provider() + timedelta(
            hours=self._settings.session_ttl_hours
        )

        try:
            auth_session = self._sessions.create(
                user_id=user.id,
                token_hash=hash_session_token(raw_token),
                expires_at=expires_at,
            )
            self._db.commit()
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None

        return LoginResult(
            access_token=raw_token,
            auth_session=auth_session,
            user=user,
        )

    def resolve_session(self, raw_token: str) -> AuthenticatedSession:
        if not is_plausible_session_token(raw_token):
            raise invalid_session_error()

        try:
            auth_session = self._sessions.get_by_token_hash(
                hash_session_token(raw_token)
            )
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None

        if auth_session is None:
            raise invalid_session_error()

        if auth_session.expires_at <= self._now_provider():
            try:
                self._sessions.delete(auth_session)
                self._db.commit()
            except SQLAlchemyError:
                self._db.rollback()
                raise internal_error() from None
            raise session_expired_error()

        return AuthenticatedSession(
            auth_session=auth_session,
            user=auth_session.user,
        )

    def logout(self, authenticated: AuthenticatedSession) -> None:
        try:
            self._sessions.delete(authenticated.auth_session)
            self._db.commit()
        except SQLAlchemyError:
            self._db.rollback()
            raise internal_error() from None
