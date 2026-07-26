from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str


class RootResponse(BaseModel):
    name: str
    status: str
    docs_url: str
