from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AppEnvironment = Literal["development", "test", "staging", "production"]


class Settings(BaseSettings):
    """Typed application settings loaded from environment variables."""

    app_name: str = "Route53 Clone API"
    app_env: AppEnvironment = "development"
    api_v1_prefix: str = Field(default="/api/v1", pattern=r"^/")
    database_url: str = "sqlite:///./route53.db"
    frontend_origin: str = "http://localhost:3000"
    session_ttl_hours: int = Field(default=24, gt=0)
    demo_user_name: str = Field(
        default="Route53 Demo User",
        min_length=1,
        max_length=255,
    )
    demo_user_email: str = Field(
        default="demo@route53.local",
        min_length=3,
        max_length=320,
    )
    demo_user_password: str = Field(
        default="Route53Demo123!",
        min_length=1,
        max_length=1024,
    )
    log_level: str = "INFO"

    @field_validator("frontend_origin")
    @classmethod
    def normalise_frontend_origin(cls, value: str) -> str:
        """Return one canonical HTTP(S) origin suitable for CORS matching."""
        candidate = value.strip()
        try:
            parsed = urlsplit(candidate)
            port = parsed.port
        except ValueError as exc:
            raise ValueError("FRONTEND_ORIGIN must be a valid HTTP(S) origin.") from exc

        if (
            parsed.scheme not in {"http", "https"}
            or parsed.hostname is None
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError(
                "FRONTEND_ORIGIN must contain only an HTTP(S) scheme and host."
            )

        host = parsed.hostname.lower()
        if ":" in host:
            host = f"[{host}]"
        if port is not None and not (
            (parsed.scheme == "http" and port == 80)
            or (parsed.scheme == "https" and port == 443)
        ):
            host = f"{host}:{port}"

        return f"{parsed.scheme}://{host}"

    @model_validator(mode="after")
    def validate_production_frontend_origin(self) -> "Settings":
        if self.app_env == "production" and not self.frontend_origin.startswith(
            "https://"
        ):
            raise ValueError("FRONTEND_ORIGIN must use HTTPS in production.")
        return self

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
