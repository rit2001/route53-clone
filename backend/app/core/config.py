from functools import lru_cache
from typing import Literal

from pydantic import Field
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
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
