import uuid

import jwt
import pytest

from app.auth.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    opaque_token,
    verify_password,
)
from app.config import Settings


def test_password_hash_and_verification():
    password_hash = hash_password("a-long-test-password")
    assert password_hash != "a-long-test-password"
    assert verify_password("a-long-test-password", password_hash)
    assert not verify_password("wrong-password", password_hash)
    assert not verify_password("a-long-test-password", None)


def test_access_token_contains_session_and_validates_audience():
    user_id, session_id = uuid.uuid4(), uuid.uuid4()
    token, expires_in = create_access_token(user_id, session_id)
    payload = decode_access_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["sid"] == str(session_id)
    assert payload["type"] == "access"
    assert 0 < expires_in <= 900


def test_token_tampering_is_rejected():
    token, _ = create_access_token(uuid.uuid4(), uuid.uuid4())
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(token[:-2] + "xx")


def test_opaque_tokens_are_unique_and_only_hashes_are_stable():
    first, second = opaque_token(), opaque_token()
    assert first != second
    assert len(first) > 40
    assert hash_token(first) == hash_token(first)
    assert hash_token(first) != hash_token(second)


def test_production_rejects_development_secrets():
    with pytest.raises(ValueError, match="JWT_SECRET|DEMO_MODE"):
        Settings(environment="production", demo_mode=False)


def test_production_requires_fail_closed_rate_limiting():
    values = {
        "environment": "production",
        "demo_mode": False,
        "jwt_secret": "a-secure-test-secret-with-at-least-32-characters",
        "database_url": "postgresql+psycopg://app:secret@db/tenantcore",
        "migration_database_url": "postgresql+psycopg://migration:secret@db/tenantcore",
    }
    with pytest.raises(ValueError, match="RATE_LIMIT_FAIL_OPEN"):
        Settings(**values, rate_limit_fail_open=True)
    assert Settings(**values, rate_limit_fail_open=False).environment == "production"
