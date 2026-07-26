import re
from ipaddress import IPv4Address, IPv6Address

from app.models.enums import DNSRecordType
from app.validators.record_name import (
    RecordNameValidationError,
    normalize_hostname_target,
)

MAX_RECORD_VALUES = 100
MAX_RAW_VALUE_LENGTH = 2_048
MAX_TXT_VALUE_LENGTH = 1_024
MAX_TXT_TOTAL_LENGTH = 4_096
MAX_UINT16 = 65_535
MAX_CAA_FLAGS = 255
CAA_PATTERN = re.compile(
    r'^(\S+)\s+([A-Za-z0-9][A-Za-z0-9-]*)\s+("[^"\r\n]+")$'
)


class RecordValueValidationError(ValueError):
    """Raised when one or more values are invalid for a record type."""


def normalize_record_values(
    record_type: DNSRecordType,
    values: list[str],
) -> list[str]:
    if record_type is DNSRecordType.SOA:
        raise RecordValueValidationError(
            "SOA records are managed internally and cannot be created."
        )
    if not values:
        raise RecordValueValidationError(
            "At least one record value is required."
        )
    if len(values) > MAX_RECORD_VALUES:
        raise RecordValueValidationError(
            f"A record set may contain at most {MAX_RECORD_VALUES} values."
        )

    normalized_values: list[str] = []
    for raw_value in values:
        if len(raw_value) > MAX_RAW_VALUE_LENGTH:
            raise RecordValueValidationError(
                f"Record values must not exceed {MAX_RAW_VALUE_LENGTH} characters."
            )
        value = raw_value.strip()
        if not value:
            raise RecordValueValidationError(
                "Record values must not be empty."
            )
        normalized_values.append(
            _normalize_value(record_type, value, len(values))
        )

    deduplicated_values = _stable_deduplicate(normalized_values)
    if record_type is DNSRecordType.TXT:
        total_length = sum(len(value) for value in deduplicated_values)
        if total_length > MAX_TXT_TOTAL_LENGTH:
            raise RecordValueValidationError(
                f"TXT payload must not exceed {MAX_TXT_TOTAL_LENGTH} characters."
            )

    return deduplicated_values


def _normalize_value(
    record_type: DNSRecordType,
    value: str,
    submitted_count: int,
) -> str:
    if record_type is DNSRecordType.A:
        return _normalize_ipv4(value)
    if record_type is DNSRecordType.AAAA:
        return _normalize_ipv6(value)
    if record_type is DNSRecordType.CNAME:
        if submitted_count != 1:
            raise RecordValueValidationError(
                "CNAME record sets require exactly one value."
            )
        return _normalize_hostname(value)
    if record_type is DNSRecordType.TXT:
        if len(value) > MAX_TXT_VALUE_LENGTH:
            raise RecordValueValidationError(
                f"TXT values must not exceed {MAX_TXT_VALUE_LENGTH} characters."
            )
        return value
    if record_type is DNSRecordType.MX:
        return _normalize_mx(value)
    if record_type in (DNSRecordType.NS, DNSRecordType.PTR):
        return _normalize_hostname(value)
    if record_type is DNSRecordType.SRV:
        return _normalize_srv(value)
    if record_type is DNSRecordType.CAA:
        return _normalize_caa(value)
    raise RecordValueValidationError(
        f"Record type {record_type.value} is not supported."
    )


def _normalize_ipv4(value: str) -> str:
    if "/" in value:
        raise RecordValueValidationError(
            "A values must be IPv4 addresses without CIDR notation."
        )
    try:
        return str(IPv4Address(value))
    except ValueError:
        raise RecordValueValidationError(
            f"{value!r} is not a valid IPv4 address."
        ) from None


def _normalize_ipv6(value: str) -> str:
    if "/" in value:
        raise RecordValueValidationError(
            "AAAA values must be IPv6 addresses without CIDR notation."
        )
    try:
        return str(IPv6Address(value))
    except ValueError:
        raise RecordValueValidationError(
            f"{value!r} is not a valid IPv6 address."
        ) from None


def _normalize_hostname(value: str) -> str:
    try:
        return normalize_hostname_target(value)
    except RecordNameValidationError as exc:
        raise RecordValueValidationError(str(exc)) from None


def _normalize_mx(value: str) -> str:
    components = value.split()
    if len(components) != 2:
        raise RecordValueValidationError(
            "MX values must use '<priority> <hostname>'."
        )
    priority = _parse_bounded_integer(
        components[0],
        label="MX priority",
        maximum=MAX_UINT16,
    )
    return f"{priority} {_normalize_hostname(components[1])}"


def _normalize_srv(value: str) -> str:
    components = value.split()
    if len(components) != 4:
        raise RecordValueValidationError(
            "SRV values must use '<priority> <weight> <port> <hostname>'."
        )
    priority = _parse_bounded_integer(
        components[0],
        label="SRV priority",
        maximum=MAX_UINT16,
    )
    weight = _parse_bounded_integer(
        components[1],
        label="SRV weight",
        maximum=MAX_UINT16,
    )
    port = _parse_bounded_integer(
        components[2],
        label="SRV port",
        maximum=MAX_UINT16,
    )
    return f"{priority} {weight} {port} {_normalize_hostname(components[3])}"


def _normalize_caa(value: str) -> str:
    match = CAA_PATTERN.fullmatch(value)
    if match is None:
        raise RecordValueValidationError(
            'CAA values must use \'<flags> <tag> "<policy>"\'.'
        )
    flags = _parse_bounded_integer(
        match.group(1),
        label="CAA flags",
        maximum=MAX_CAA_FLAGS,
    )
    tag = match.group(2).lower()
    return f"{flags} {tag} {match.group(3)}"


def _parse_bounded_integer(
    token: str,
    *,
    label: str,
    maximum: int,
) -> int:
    if not token.isascii() or not token.isdigit():
        raise RecordValueValidationError(f"{label} must be an integer.")
    parsed = int(token)
    if parsed > maximum:
        raise RecordValueValidationError(
            f"{label} must be between 0 and {maximum}."
        )
    return parsed


def _stable_deduplicate(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))
