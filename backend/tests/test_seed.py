from sqlalchemy import func, select
from sqlalchemy.orm import Session as DatabaseSession

from app.core.config import Settings
from app.core.security import verify_password
from app.models.user import User
from app.seed import seed_demo_user


def test_seed_creates_hashed_normalized_demo_user_idempotently(
    db_session: DatabaseSession,
) -> None:
    settings = Settings(
        _env_file=None,
        demo_user_name="Route53 Demo User",
        demo_user_email="  DEMO@Route53.Local ",
        demo_user_password="Route53Demo123!",
    )

    first_result = seed_demo_user(db_session, settings)
    original_hash = first_result.user.password_hash
    second_result = seed_demo_user(db_session, settings)

    assert first_result.created is True
    assert second_result.created is False
    assert first_result.user.id == second_result.user.id
    assert first_result.user.email == "demo@route53.local"
    assert original_hash != settings.demo_user_password
    assert verify_password(settings.demo_user_password, original_hash) is True
    assert db_session.scalar(select(func.count()).select_from(User)) == 1


def test_seed_does_not_overwrite_existing_user_credentials(
    db_session: DatabaseSession,
) -> None:
    existing_user = User(
        name="Existing User",
        email="demo@route53.local",
        password_hash="existing-password-hash",
    )
    db_session.add(existing_user)
    db_session.commit()
    settings = Settings(
        _env_file=None,
        demo_user_name="Changed Name",
        demo_user_email="DEMO@ROUTE53.LOCAL",
        demo_user_password="NewPassword123!",
    )

    result = seed_demo_user(db_session, settings)

    assert result.created is False
    assert result.user.id == existing_user.id
    assert result.user.name == "Existing User"
    assert result.user.password_hash == "existing-password-hash"
    assert db_session.scalar(select(func.count()).select_from(User)) == 1
