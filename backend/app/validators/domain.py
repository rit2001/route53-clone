import re

MAX_DOMAIN_LENGTH = 253
MAX_LABEL_LENGTH = 63
DOMAIN_LABEL_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


class DomainNameValidationError(ValueError):
    """Raised when a hosted-zone name cannot be stored canonically."""


def normalize_domain_name(value: str) -> str:
    """Validate an ASCII DNS name and return one lowercase trailing-dot form."""
    candidate = value.strip().lower()
    if not candidate:
        raise DomainNameValidationError("Domain name must not be empty.")
    if not candidate.isascii():
        raise DomainNameValidationError(
            "Internationalized domain names are not supported."
        )
    if "://" in candidate:
        raise DomainNameValidationError("Domain name must not include a URL scheme.")
    if "/" in candidate or "\\" in candidate:
        raise DomainNameValidationError("Domain name must not include a path.")
    if ":" in candidate:
        raise DomainNameValidationError("Domain name must not include a port.")
    if "@" in candidate:
        raise DomainNameValidationError("Domain name must not be an email address.")
    if "*" in candidate:
        raise DomainNameValidationError("Wildcard hosted-zone names are not supported.")

    relative_name = candidate[:-1] if candidate.endswith(".") else candidate
    if not relative_name:
        raise DomainNameValidationError("Domain name must not be empty.")
    if ".." in relative_name:
        raise DomainNameValidationError(
            "Domain name must not contain empty labels."
        )
    if len(relative_name) > MAX_DOMAIN_LENGTH:
        raise DomainNameValidationError(
            f"Domain name must not exceed {MAX_DOMAIN_LENGTH} characters."
        )

    labels = relative_name.split(".")
    if len(labels) < 2:
        raise DomainNameValidationError(
            "Hosted-zone names must contain at least two labels."
        )
    for label in labels:
        if len(label) > MAX_LABEL_LENGTH:
            raise DomainNameValidationError(
                f"Domain labels must not exceed {MAX_LABEL_LENGTH} characters."
            )
        if DOMAIN_LABEL_PATTERN.fullmatch(label) is None:
            raise DomainNameValidationError(
                "Domain labels may contain letters, digits, and internal hyphens only."
            )

    return f"{relative_name}."


def normalize_search_term(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None
