from enum import Enum

from sqlalchemy import Enum as SQLAlchemyEnum


class HostedZoneType(str, Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class DNSRecordType(str, Enum):
    A = "A"
    AAAA = "AAAA"
    CNAME = "CNAME"
    TXT = "TXT"
    MX = "MX"
    NS = "NS"
    PTR = "PTR"
    SRV = "SRV"
    CAA = "CAA"
    SOA = "SOA"


class RoutingPolicy(str, Enum):
    SIMPLE = "SIMPLE"


HOSTED_ZONE_TYPE_DB_ENUM = SQLAlchemyEnum(
    HostedZoneType,
    name="hosted_zone_type",
    native_enum=False,
    create_constraint=True,
    validate_strings=True,
)
DNS_RECORD_TYPE_DB_ENUM = SQLAlchemyEnum(
    DNSRecordType,
    name="dns_record_type",
    native_enum=False,
    create_constraint=True,
    validate_strings=True,
)
ROUTING_POLICY_DB_ENUM = SQLAlchemyEnum(
    RoutingPolicy,
    name="routing_policy",
    native_enum=False,
    create_constraint=True,
    validate_strings=True,
)
