import re

from app.models.enums import DNSRecordType
from app.validators.domain import MAX_DOMAIN_LENGTH, MAX_LABEL_LENGTH

HOST_LABEL_PATTERN = re.compile(
    r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$"
)
SERVICE_LABEL_PATTERN = re.compile(
    r"^_[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?$"
)


class RecordNameValidationError(ValueError):
    """Raised when a DNS record owner name or target is invalid."""


def normalize_record_name(
    submitted_name: str,
    zone_name: str,
    record_type: DNSRecordType,
) -> str:
    """Resolve an owner name inside a canonical hosted zone."""
    candidate = submitted_name.strip().lower()
    zone_relative = zone_name[:-1]
    if not candidate or candidate == "@":
        return zone_name
    _reject_common_name_errors(candidate, kind="Record name")
    if "@" in candidate:
        raise RecordNameValidationError(
            "Record name must not be an email address."
        )

    was_absolute = candidate.endswith(".")
    relative_candidate = candidate[:-1] if was_absolute else candidate
    if (
        relative_candidate == zone_relative
        or relative_candidate.endswith(f".{zone_relative}")
    ):
        resolved = relative_candidate
    elif was_absolute:
        raise RecordNameValidationError(
            "Fully qualified record name must be inside the hosted zone."
        )
    else:
        resolved = f"{relative_candidate}.{zone_relative}"

    _validate_record_labels(resolved, record_type)
    if len(resolved) > MAX_DOMAIN_LENGTH:
        raise RecordNameValidationError(
            f"Record name must not exceed {MAX_DOMAIN_LENGTH} characters."
        )
    return f"{resolved}."


def normalize_hostname_target(value: str) -> str:
    """Canonicalize a non-wildcard DNS hostname target."""
    candidate = value.strip().lower()
    if not candidate or candidate == ".":
        raise RecordNameValidationError("Hostname target must not be empty.")
    _reject_common_name_errors(candidate, kind="Hostname target")
    if "@" in candidate:
        raise RecordNameValidationError(
            "Hostname target must not be an email address."
        )
    if "*" in candidate:
        raise RecordNameValidationError(
            "Hostname target must not contain a wildcard."
        )

    relative_candidate = candidate[:-1] if candidate.endswith(".") else candidate
    _reject_ip_address(relative_candidate)
    if len(relative_candidate) > MAX_DOMAIN_LENGTH:
        raise RecordNameValidationError(
            f"Hostname target must not exceed {MAX_DOMAIN_LENGTH} characters."
        )
    labels = relative_candidate.split(".")
    for label in labels:
        if not label:
            raise RecordNameValidationError(
                "Hostname target must not contain empty labels."
            )
        if len(label) > MAX_LABEL_LENGTH:
            raise RecordNameValidationError(
                f"Hostname labels must not exceed {MAX_LABEL_LENGTH} characters."
            )
        if HOST_LABEL_PATTERN.fullmatch(label) is None:
            raise RecordNameValidationError(
                "Hostname labels may contain letters, digits, and internal "
                "hyphens only."
            )
    return f"{relative_candidate}."


def _reject_common_name_errors(candidate: str, *, kind: str) -> None:
    if not candidate.isascii():
        raise RecordNameValidationError(
            f"{kind} must contain ASCII characters only."
        )
    if "://" in candidate:
        raise RecordNameValidationError(f"{kind} must not include a URL scheme.")
    if "/" in candidate or "\\" in candidate:
        raise RecordNameValidationError(f"{kind} must not include a path.")
    if ":" in candidate:
        raise RecordNameValidationError(f"{kind} must not include a port.")
    if any(character.isspace() for character in candidate):
        raise RecordNameValidationError(
            f"{kind} must not contain whitespace."
        )


def _validate_record_labels(
    resolved_name: str,
    record_type: DNSRecordType,
) -> None:
    labels = resolved_name.split(".")
    wildcard_indexes = [
        index for index, label in enumerate(labels) if "*" in label
    ]
    if wildcard_indexes and wildcard_indexes != [0]:
        raise RecordNameValidationError(
            "A wildcard is allowed only as the complete leftmost label."
        )
    if labels[0] == "*" and len(labels) < 3:
        raise RecordNameValidationError(
            "Wildcard record name must be below a hosted zone."
        )

    for index, label in enumerate(labels):
        if not label:
            raise RecordNameValidationError(
                "Record name must not contain empty labels."
            )
        if len(label) > MAX_LABEL_LENGTH:
            raise RecordNameValidationError(
                f"Record labels must not exceed {MAX_LABEL_LENGTH} characters."
            )
        if label == "*" and index == 0:
            continue
        if "*" in label:
            raise RecordNameValidationError(
                "A wildcard is allowed only as the complete leftmost label."
            )
        if label.startswith("_"):
            if SERVICE_LABEL_PATTERN.fullmatch(label) is None:
                raise RecordNameValidationError(
                    "Service labels may have one leading underscore followed "
                    "by letters, digits, or internal hyphens."
                )
            continue
        if "_" in label or HOST_LABEL_PATTERN.fullmatch(label) is None:
            type_hint = (
                " SRV names may use leading-underscore service labels."
                if record_type is DNSRecordType.SRV
                else ""
            )
            raise RecordNameValidationError(
                "Record labels may contain letters, digits, and internal "
                f"hyphens only.{type_hint}"
            )


def _reject_ip_address(candidate: str) -> None:
    from ipaddress import ip_address

    try:
        ip_address(candidate)
    except ValueError:
        return
    raise RecordNameValidationError(
        "Hostname target must not be an IP address."
    )
