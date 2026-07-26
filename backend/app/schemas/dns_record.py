from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.dns_record import MAX_TTL
from app.models.enums import DNSRecordType, RoutingPolicy
from app.validators.record_value import (
    MAX_RAW_VALUE_LENGTH,
    MAX_RECORD_VALUES,
)

MAX_RECORD_NAME_INPUT_LENGTH = 512
RecordValueInput = Annotated[
    str,
    Field(min_length=1, max_length=MAX_RAW_VALUE_LENGTH),
]


class UserCreatableDNSRecordType(str, Enum):
    A = "A"
    AAAA = "AAAA"
    CNAME = "CNAME"
    TXT = "TXT"
    MX = "MX"
    NS = "NS"
    PTR = "PTR"
    SRV = "SRV"
    CAA = "CAA"


class DNSRecordCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "name": "api",
                    "record_type": "A",
                    "values": ["192.0.2.10"],
                    "ttl": 300,
                    "routing_policy": "SIMPLE",
                    "alias": False,
                }
            ]
        },
    )

    name: str = Field(default="", max_length=MAX_RECORD_NAME_INPUT_LENGTH)
    record_type: UserCreatableDNSRecordType
    values: list[RecordValueInput] = Field(
        min_length=1,
        max_length=MAX_RECORD_VALUES,
    )
    ttl: int = Field(ge=1, le=MAX_TTL)
    routing_policy: RoutingPolicy = RoutingPolicy.SIMPLE
    alias: bool = False


class DNSRecordUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    values: list[RecordValueInput] | None = Field(
        default=None,
        min_length=1,
        max_length=MAX_RECORD_VALUES,
    )
    ttl: int | None = Field(default=None, ge=1, le=MAX_TTL)

    @model_validator(mode="after")
    def reject_empty_update(self) -> "DNSRecordUpdate":
        if not self.model_fields_set.intersection({"values", "ttl"}):
            raise ValueError("At least one editable field must be provided.")
        if "values" in self.model_fields_set and self.values is None:
            raise ValueError("Values must not be null.")
        if "ttl" in self.model_fields_set and self.ttl is None:
            raise ValueError("TTL must not be null.")
        return self


class DNSRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    record_type: DNSRecordType
    values: list[str]
    ttl: int
    routing_policy: RoutingPolicy
    alias: bool
    is_system: bool
    created_at: datetime
    updated_at: datetime


class DNSRecordListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[DNSRecordResponse]
    page: int
    page_size: int
    total: int
    total_pages: int
