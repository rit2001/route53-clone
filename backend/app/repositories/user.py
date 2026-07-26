from sqlalchemy import select
from sqlalchemy.orm import Session as DatabaseSession

from app.models.user import User


class UserRepository:
    def __init__(self, db: DatabaseSession) -> None:
        self._db = db

    def get_by_email(self, email: str) -> User | None:
        return self._db.scalar(select(User).where(User.email == email))

    def get_by_id(self, user_id: str) -> User | None:
        return self._db.get(User, user_id)

    def create(
        self,
        *,
        name: str,
        email: str,
        password_hash: str,
    ) -> User:
        user = User(
            name=name,
            email=email,
            password_hash=password_hash,
        )
        self._db.add(user)
        self._db.flush()
        return user
