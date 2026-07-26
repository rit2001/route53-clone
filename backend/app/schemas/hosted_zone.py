from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import HostedZoneType

MAX_COMMENT_LENGTH = 256
MAX_DOMAIN_INPUT_LENGTH = 512


def normalize_comment_input(value: object) -> object:
    if not isinstance(value, str):
        return value
    normalized = value.strip()
    return normalized or None


class HostedZoneCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=MAX_DOMAIN_INPUT_LENGTH)
    comment: str | None = Field(default=None, max_length=MAX_COMMENT_LENGTH)
    zone_type: HostedZoneType

    @field_validator("comment", mode="before")
    @classmethod
    def normalize_comment(cls, value: object) -> object:
        return normalize_comment_input(value)


class HostedZoneUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    comment: str | None = Field(default=None, max_length=MAX_COMMENT_LENGTH)

    @field_validator("comment", mode="before")
    @classmethod
    def normalize_comment(cls, value: object) -> object:
        return normalize_comment_input(value)

    @model_validator(mode="after")
    def reject_empty_update(self) -> "HostedZoneUpdate":
        if "comment" not in self.model_fields_set:
            raise ValueError("At least one editable field must be provided.")
        return self


class HostedZoneListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    comment: str | None
    zone_type: HostedZoneType
    record_count: int
    created_at: datetime
    updated_at: datetime


class HostedZoneDetail(HostedZoneListItem):
    name_servers: list[str]


class HostedZoneListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[HostedZoneListItem]
    page: int
    page_size: int
    total: int
    total_pages: int
