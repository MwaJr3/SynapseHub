import pytest
from app.authorization import AuthorizationError, validate_targets

ALLOW = ["10.0.0.0/24", "lab.internal.example"]


def test_exact_host_and_cidr_allowed():
    assert validate_targets(["lab.internal.example"], ALLOW, 8, 100) == ["lab.internal.example"]
    assert validate_targets(["10.0.0.7"], ALLOW, 8, 100) == ["10.0.0.7"]


def test_arbitrary_targets_refused():
    with pytest.raises(AuthorizationError, match="allowlist"):
        validate_targets(["scanme.example.com"], ALLOW, 8, 100)
    with pytest.raises(AuthorizationError):
        validate_targets(["8.8.8.8"], ALLOW, 8, 100)


def test_target_and_port_limits_enforced():
    with pytest.raises(AuthorizationError, match="limit"):
        validate_targets([f"10.0.0.{i}" for i in range(10)], ALLOW, 8, 100)
    with pytest.raises(AuthorizationError, match="limit"):
        validate_targets(["10.0.0.5"], ALLOW, 8, 5, ports=list(range(20)))
    with pytest.raises(AuthorizationError):
        validate_targets([], ALLOW, 8, 100)


def test_invalid_target_format_refused():
    with pytest.raises(AuthorizationError):
        validate_targets(["not a host!!"], ALLOW, 8, 100)
