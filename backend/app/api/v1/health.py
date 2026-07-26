from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.schemas.health import HealthResponse
from app.services.health import HealthService

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Check API health")
def get_health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthService(settings).get_status()
