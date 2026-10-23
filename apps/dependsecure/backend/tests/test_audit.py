"""Scanner-adapter tests: success, no-findings, failures, timeout, safety."""
import json
import subprocess
from types import SimpleNamespace

from app import audit


def fake_runner(payload: dict, returncode: int = 1):
    def runner(args, timeout):
        assert isinstance(args, list), "arguments must be a list (no shell)"
        assert "--no-deps" in args, "uploaded projects are never installed"
        assert "shell" not in args
        return SimpleNamespace(returncode=returncode, stdout=json.dumps(payload), stderr="")

    return runner


def test_run_pip_audit_parses_and_dedupes_findings():
    payload = {
        "dependencies": [
            {
                "name": "requests",
                "version": "2.19.0",
                "vulns": [
                    {"id": "PYSEC-2018-28", "aliases": ["CVE-2018-18074"], "description": "d", "fix_versions": ["2.20.0"]},
                    {"id": "PYSEC-2018-28", "aliases": ["CVE-2018-18074"], "description": "d", "fix_versions": ["2.20.0"]},
                    {"id": "GHSA-xxxx", "aliases": [], "description": "d2", "fix_versions": []},
                ],
            }
        ]
    }
    result = audit.run_pip_audit("requests==2.19.0\n", "requirements.txt", runner=fake_runner(payload))
    assert result.status == "completed"
    ids = [f.advisory_id for f in result.findings]
    assert ids == ["PYSEC-2018-28", "GHSA-xxxx"]
    assert result.findings[0].fix_versions == ["2.20.0"]
    assert result.raw == payload


def test_run_pip_audit_zero_findings_is_not_a_failure():
    payload = {"dependencies": [{"name": "flask", "version": "3.0", "vulns": []}]}
    result = audit.run_pip_audit("flask==3.0\n", "requirements.txt", runner=fake_runner(payload, returncode=0))
    assert result.status == "completed"
    assert result.findings == []


def test_run_pip_audit_timeout_is_failure():
    def runner(args, timeout):
        raise subprocess.TimeoutExpired(cmd=args, timeout=timeout)

    result = audit.run_pip_audit("x==1\n", "requirements.txt", runner=runner)
    assert result.status == "failed"
    assert "time limit" in result.error


def test_run_pip_audit_unreachable_source_is_explicit():
    def runner(args, timeout):
        return SimpleNamespace(returncode=2, stdout="", stderr="ConnectionError: network unreachable")

    result = audit.run_pip_audit("x==1\n", "requirements.txt", runner=runner)
    assert result.status == "failed"
    assert "vulnerability source" in result.error


def test_run_pip_audit_resolution_conflict_is_failure():
    def runner(args, timeout):
        return SimpleNamespace(
            returncode=1,
            stdout="",
            stderr="ERROR: Cannot install -r req.txt (line 1) and urllib3==1.26.5 because these package versions have conflicting dependencies.\nERROR: ResolutionImpossible",
        )

    result = audit.run_pip_audit("x==1\n", "requirements.txt", runner=runner)
    assert result.status == "failed"
    assert "conflict" in result.error


def test_run_pip_audit_unparseable_output_is_failure():
    def runner(args, timeout):
        return SimpleNamespace(returncode=0, stdout="not-json", stderr="")

    result = audit.run_pip_audit("x==1\n", "requirements.txt", runner=runner)
    assert result.status == "failed"
    assert "JSON" in result.error
