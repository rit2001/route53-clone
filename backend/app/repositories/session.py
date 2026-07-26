from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session as DatabaseSession
from sqlalchemy.orm import joinedload

from app.models.session import Session


class SessionRepository:
    def __init__(self, db: DatabaseSession) -> None:
        self._db = db

    def create(
        self,
        *,
        user_id: str,
        token_hash: str,
        expires_at: datetime,
    ) -> Session:
        auth_session = Session(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self._db.add(auth_session)
        self._db.flush()
        return auth_session

    def get_by_token_hash(self, token_hash: str) -> Session | None:
        statement = (
            select(Session)
            .options(joinedload(Session.user).raiseload("*"))
            .where(Session.token_hash == token_hash)
        )
        return self._db.scalar(statement)

    def delete(self, auth_session: Session) -> None:
        self._db.delete(auth_session)
