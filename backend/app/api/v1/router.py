from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.dns_records import router as dns_records_router
from app.api.v1.health import router as health_router
from app.api.v1.hosted_zones import router as hosted_zones_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(health_router)
api_router.include_router(hosted_zones_router)
api_router.include_router(dns_records_router)
