from dataclasses import dataclass

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session as DatabaseSession

from app.core.config import Settings, get_settings
from app.core.database import SessionLocal
from app.core.security import hash_password, normalize_email
from app.models.user import User
from app.repositories.user import UserRepository


@dataclass(frozen=True)
class SeedResult:
    user: User
    created: bool


def seed_demo_user(
    db: DatabaseSession,
    settings: Settings,
) -> SeedResult:
    users = UserRepository(db)
    email = normalize_email(settings.demo_user_email)

    try:
        existing_user = users.get_by_email(email)
        if existing_user is not None:
            return SeedResult(user=existing_user, created=False)

        user = users.create(
            name=settings.demo_user_name.strip(),
            email=email,
            password_hash=hash_password(settings.demo_user_password),
        )
        db.commit()
        return SeedResult(user=user, created=True)
    except SQLAlchemyError as exc:
        db.rollback()
        raise RuntimeError("Unable to seed the demo user.") from exc


def main() -> None:
    settings = get_settings()
    with SessionLocal() as db:
        result = seed_demo_user(db, settings)

    outcome = "created" if result.created else "already exists"
    print(f"Demo user {result.user.email}: {outcome}.")


if __name__ == "__main__":
    main()
