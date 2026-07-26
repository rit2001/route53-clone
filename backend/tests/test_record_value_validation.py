import pytest

from app.models.enums import DNSRecordType
from app.validators.record_value import (
    MAX_TXT_TOTAL_LENGTH,
    MAX_TXT_VALUE_LENGTH,
    RecordValueValidationError,
    normalize_record_values,
)


@pytest.mark.parametrize(
    ("record_type", "values", "expected"),
    [
        (DNSRecordType.A, ["192.0.2.1", "8.8.8.8"], ["192.0.2.1", "8.8.8.8"]),
        (
            DNSRecordType.AAAA,
            ["2001:0DB8:0:0:0:0:0:1"],
            ["2001:db8::1"],
        ),
        (
            DNSRecordType.CNAME,
            ["Target.Example.NET"],
            ["target.example.net."],
        ),
        (
            DNSRecordType.TXT,
            ['  "quoted value"  ', "internal  spaces"],
            ['"quoted value"', "internal  spaces"],
        ),
        (
            DNSRecordType.MX,
            ["010   Mail.Example.NET"],
            ["10 mail.example.net."],
        ),
        (
            DNSRecordType.NS,
            ["NS1.Example.NET", "ns2.example.net."],
            ["ns1.example.net.", "ns2.example.net."],
        ),
        (
            DNSRecordType.PTR,
            ["Host.Example.NET"],
            ["host.example.net."],
        ),
        (
            DNSRecordType.SRV,
            ["010 005 0443 Service.Example.NET"],
            ["10 5 443 service.example.net."],
        ),
        (
            DNSRecordType.CAA,
            ['000 issuewild "letsencrypt.org"'],
            ['0 issuewild "letsencrypt.org"'],
        ),
        (
            DNSRecordType.CAA,
            ['0 iodef "mailto:security@example.com"'],
            ['0 iodef "mailto:security@example.com"'],
        ),
    ],
)
def test_record_values_are_type_normalized(
    record_type: DNSRecordType,
    values: list[str],
    expected: list[str],
) -> None:
    assert normalize_record_values(record_type, values) == expected


def test_normalized_duplicate_values_are_removed_in_first_seen_order() -> None:
    assert normalize_record_values(
        DNSRecordType.AAAA,
        [
            "2001:db8::1",
            "2001:0DB8:0:0:0:0:0:1",
            "2001:db8::2",
        ],
    ) == ["2001:db8::1", "2001:db8::2"]


@pytest.mark.parametrize(
    ("record_type", "values"),
    [
        (DNSRecordType.A, ["2001:db8::1"]),
        (DNSRecordType.A, ["192.0.2.0/24"]),
        (DNSRecordType.A, ["example.com"]),
        (DNSRecordType.AAAA, ["192.0.2.1"]),
        (DNSRecordType.AAAA, ["2001:db8::/32"]),
        (DNSRecordType.AAAA, ["example.com"]),
        (DNSRecordType.CNAME, ["one.example", "two.example"]),
        (DNSRecordType.CNAME, ["192.0.2.1"]),
        (DNSRecordType.TXT, ["   "]),
        (DNSRecordType.TXT, ["x" * (MAX_TXT_VALUE_LENGTH + 1)]),
        (
            DNSRecordType.TXT,
            [
                f"{index}" + ("x" * 999)
                for index in range((MAX_TXT_TOTAL_LENGTH // 1_000) + 1)
            ],
        ),
        (DNSRecordType.MX, ["mail.example.com"]),
        (DNSRecordType.MX, ["-1 mail.example.com"]),
        (DNSRecordType.MX, ["65536 mail.example.com"]),
        (DNSRecordType.MX, ["priority mail.example.com"]),
        (DNSRecordType.MX, ["10 192.0.2.1"]),
        (DNSRecordType.NS, ["192.0.2.1"]),
        (DNSRecordType.PTR, ["192.0.2.1"]),
        (DNSRecordType.PTR, ["bad_.example.com"]),
        (DNSRecordType.SRV, ["10 5 443"]),
        (DNSRecordType.SRV, ["-1 5 443 service.example.com"]),
        (DNSRecordType.SRV, ["10 65536 443 service.example.com"]),
        (DNSRecordType.SRV, ["10 5 65536 service.example.com"]),
        (DNSRecordType.SRV, ["10 5 443 192.0.2.1"]),
        (DNSRecordType.CAA, ['-1 issue "ca.example"']),
        (DNSRecordType.CAA, ['256 issue "ca.example"']),
        (DNSRecordType.CAA, ['0 "ca.example"']),
        (DNSRecordType.CAA, ["0 issue ca.example"]),
        (DNSRecordType.CAA, ["malformed"]),
        (DNSRecordType.SOA, ["internal value"]),
    ],
)
def test_invalid_type_specific_values_are_rejected(
    record_type: DNSRecordType,
    values: list[str],
) -> None:
    with pytest.raises(RecordValueValidationError):
        normalize_record_values(record_type, values)


def test_empty_record_set_is_rejected() -> None:
    with pytest.raises(RecordValueValidationError):
        normalize_record_values(DNSRecordType.A, [])
