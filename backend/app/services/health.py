from app.core.config import Settings
from app.schemas.health import HealthResponse


class HealthService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def get_status(self) -> HealthResponse:
        return HealthResponse(
            status="healthy",
            service="route53-clone-api",
            environment=self._settings.app_env,
        )
