from app.core.config import Settings


def test_settings_can_be_overridden_from_environment(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DATABASE_URL", "sqlite:////tmp/route53-test.db")
    monkeypatch.setenv("SESSION_TTL_HOURS", "12")

    settings = Settings(_env_file=None)

    assert settings.app_env == "test"
    assert settings.database_url == "sqlite:////tmp/route53-test.db"
    assert settings.session_ttl_hours == 12
