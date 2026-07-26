import pytest

from app.models.enums import DNSRecordType
from app.validators.record_name import (
    RecordNameValidationError,
    normalize_hostname_target,
    normalize_record_name,
)

ZONE_NAME = "example.com."


@pytest.mark.parametrize(
    ("submitted", "expected"),
    [
        ("", ZONE_NAME),
        ("   ", ZONE_NAME),
        ("@", ZONE_NAME),
        ("example.com", ZONE_NAME),
        ("example.com.", ZONE_NAME),
        ("www", "www.example.com."),
        ("api.dev", "api.dev.example.com."),
        ("api.example.com", "api.example.com."),
        ("api.example.com.", "api.example.com."),
        ("API.Example.COM", "api.example.com."),
        ("_mail", "_mail.example.com."),
    ],
)
def test_record_names_resolve_inside_zone(
    submitted: str,
    expected: str,
) -> None:
    assert (
        normalize_record_name(submitted, ZONE_NAME, DNSRecordType.MX)
        == expected
    )


@pytest.mark.parametrize(
    "submitted",
    [
        "outside.org.",
        "api.outside.org.",
        "https://example.com",
        "example.com/path",
        "example.com:8000",
        "user@example.com",
        "api..example.com",
        f"{'a' * 64}.example.com",
        ".".join(("a" * 63, "b" * 63, "c" * 63, "d" * 63)),
        "api.*.example.com",
        "*.*.example.com",
        "mail_.example.com",
        "__mail.example.com",
        "_mail_.example.com",
        "münchen.example.com",
    ],
)
def test_invalid_record_names_are_rejected(submitted: str) -> None:
    with pytest.raises(RecordNameValidationError):
        normalize_record_name(submitted, ZONE_NAME, DNSRecordType.A)


@pytest.mark.parametrize(
    ("submitted", "expected"),
    [
        ("*", "*.example.com."),
        ("*.api", "*.api.example.com."),
        ("*.api.example.com.", "*.api.example.com."),
    ],
)
def test_leftmost_wildcard_record_names_are_supported(
    submitted: str,
    expected: str,
) -> None:
    assert (
        normalize_record_name(submitted, ZONE_NAME, DNSRecordType.A)
        == expected
    )


def test_srv_service_labels_are_supported() -> None:
    assert normalize_record_name(
        "_SIP._TCP",
        ZONE_NAME,
        DNSRecordType.SRV,
    ) == "_sip._tcp.example.com."


@pytest.mark.parametrize(
    ("submitted", "expected"),
    [
        ("Mail.Example.COM", "mail.example.com."),
        ("mail.example.com.", "mail.example.com."),
        ("external.example.net", "external.example.net."),
    ],
)
def test_hostname_targets_are_canonicalized(
    submitted: str,
    expected: str,
) -> None:
    assert normalize_hostname_target(submitted) == expected


@pytest.mark.parametrize(
    "submitted",
    [
        "192.0.2.1",
        "2001:db8::1",
        "https://mail.example.com",
        "mail.example.com/path",
        "mail.example.com:25",
        "*.example.com",
        "bad_.example.com",
        "-mail.example.com",
        "mail-.example.com",
        "mail..example.com",
        ".",
    ],
)
def test_invalid_hostname_targets_are_rejected(submitted: str) -> None:
    with pytest.raises(RecordNameValidationError):
        normalize_hostname_target(submitted)
