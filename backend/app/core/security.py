import hashlib
import re
import secrets

from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError

SESSION_TOKEN_BYTES = 32
SESSION_TOKEN_MIN_LENGTH = 40
SESSION_TOKEN_MAX_LENGTH = 256
SESSION_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")

password_hasher = PasswordHash.recommended()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except (UnknownHashError, TypeError, ValueError):
        return False


def generate_session_token() -> str:
    return secrets.token_urlsafe(SESSION_TOKEN_BYTES)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def is_plausible_session_token(token: str) -> bool:
    return (
        SESSION_TOKEN_MIN_LENGTH <= len(token) <= SESSION_TOKEN_MAX_LENGTH
        and SESSION_TOKEN_PATTERN.fullmatch(token) is not None
    )
