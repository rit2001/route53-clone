import pytest

from app.validators.domain import (
    MAX_DOMAIN_LENGTH,
    DomainNameValidationError,
    normalize_domain_name,
    normalize_search_term,
)


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("Example.COM", "example.com."),
        ("example.com.", "example.com."),
        ("  api.example.com  ", "api.example.com."),
        ("deep.api.example.org", "deep.api.example.org."),
    ],
)
def test_domain_names_are_canonicalized(value: str, expected: str) -> None:
    assert normalize_domain_name(value) == expected


@pytest.mark.parametrize(
    "value",
    [
        "",
        "   ",
        "https://example.com",
        "example.com/path",
        "example.com:8000",
        "user@example.com",
        "example..com",
        "-example.com",
        "example-.com",
        f"{'a' * 64}.com",
        f"{'a' * 63}.{'b' * 63}.{'c' * 63}.{'d' * 62}.com",
        "*.example.com",
        "com",
        "münchen.example",
    ],
)
def test_invalid_hosted_zone_names_are_rejected(value: str) -> None:
    with pytest.raises(DomainNameValidationError):
        normalize_domain_name(value)


def test_domain_at_maximum_length_is_accepted() -> None:
    domain = ".".join(("a" * 63, "b" * 63, "c" * 63, "d" * 61))

    assert len(domain) == MAX_DOMAIN_LENGTH
    assert normalize_domain_name(domain) == f"{domain}."


def test_search_normalization_trims_lowercases_and_ignores_empty_values() -> None:
    assert normalize_search_term("  EXAMPLE  ") == "example"
    assert normalize_search_term("   ") is None
    assert normalize_search_term(None) is None
