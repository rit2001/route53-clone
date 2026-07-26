import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_can_be_overridden_from_environment(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DATABASE_URL", "sqlite:////tmp/route53-test.db")
    monkeypatch.setenv("SESSION_TTL_HOURS", "12")

    settings = Settings(_env_file=None)

    assert settings.app_env == "test"
    assert settings.database_url == "sqlite:////tmp/route53-test.db"
    assert settings.session_ttl_hours == 12


def test_demo_user_settings_have_safe_mock_defaults() -> None:
    settings = Settings(_env_file=None)

    assert settings.demo_user_name == "Route53 Demo User"
    assert settings.demo_user_email == "demo@route53.local"
    assert settings.demo_user_password == "Route53Demo123!"


def test_non_positive_session_ttl_is_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, session_ttl_hours=0)
