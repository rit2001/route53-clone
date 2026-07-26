from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.exceptions import APIError
from app.schemas.health import RootResponse


def create_application(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()
    application = FastAPI(
        title=app_settings.app_name,
        description="Backend API for the Route53 Clone internship assignment.",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{app_settings.api_v1_prefix}/openapi.json",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=[app_settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.exception_handler(APIError)
    async def handle_api_error(_: Request, exc: APIError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": {
                    "code": exc.code,
                    "message": exc.message,
                }
            },
            headers=exc.headers,
        )

    application.include_router(api_router, prefix=app_settings.api_v1_prefix)

    @application.get("/", response_model=RootResponse, tags=["system"])
    def root() -> RootResponse:
        return RootResponse(
            name=app_settings.app_name,
            status="available",
            docs_url="/docs",
        )

    return application


app = create_application()
