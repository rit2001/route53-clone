from app.core.security import (
    SESSION_TOKEN_MIN_LENGTH,
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)


def test_password_hashing_and_verification() -> None:
    password = "Route53Demo123!"
    password_hash = hash_password(password)

    assert password_hash != password
    assert password not in password_hash
    assert verify_password(password, password_hash) is True
    assert verify_password("incorrect-password", password_hash) is False


def test_invalid_password_hash_fails_safely() -> None:
    assert verify_password("password", "not-a-valid-hash") is False


def test_session_tokens_are_random_and_sufficiently_long() -> None:
    first_token = generate_session_token()
    second_token = generate_session_token()

    assert first_token
    assert len(first_token) >= SESSION_TOKEN_MIN_LENGTH
    assert first_token != second_token


def test_session_token_hash_is_deterministic_and_not_raw_token() -> None:
    token = generate_session_token()
    first_hash = hash_session_token(token)

    assert first_hash != token
    assert hash_session_token(token) == first_hash
    assert len(first_hash) == 64
