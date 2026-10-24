from app.redaction import AiConsentError, ai_payload, redact_evidence
from app.rules.python_rules import python_ruleset
from app.rules.secrets_rules import secret_ruleset
from app.parsers.bandit_parser import parse_bandit_json


SRC = """
import subprocess, hashlib, yaml, pickle, os
password = "hunter2secret"
subprocess.run("ls", shell=True)
eval(user_input)
h = hashlib.md5(b"x")
data = yaml.load(stream)
obj = pickle.loads(blob)
requests.get(url, verify=False)
assert user.is_admin
"""


def test_python_rules_detect_expected_constructs():
    findings = python_ruleset.run([("app.py", SRC)])
    ids = {f.rule_id for f in findings}
    assert {"PY-EXEC", "PY-SHELL", "PY-PICKLE", "PY-YAML", "PY-ASSERT",
            "PY-WEAKHASH", "PY-HARDCODED-PW", "PY-REQUESTS-VERIFY"} <= ids
    for f in findings:
        assert f.suggested_fix and f.explanation and f.cwe.startswith("CWE-")
        assert f.line > 0


def test_rules_do_not_invent_findings_on_clean_code():
    assert python_ruleset.run([("clean.py", "def add(a, b):\n    return a + b\n")]) == []


def test_secret_rules_and_redaction():
    findings = secret_ruleset.run([("config.env", "AWS_KEY=AKIAABCDEFGHIJKLMNOP\n")])
    assert any(f.rule_id == "SEC-AWS-KEY" for f in findings)
    red = redact_evidence('token = "abcdefghijklmn"')
    assert "abcdefghijklmn" not in red and red.endswith('abcd"') is False
    assert "*" in red


def test_ai_gate_blocks_without_consent_and_sends_nothing():
    for kwargs, match in [
        (dict(ai_enabled=False, consent_given=True, endpoint="https://x"), "disabled"),
        (dict(ai_enabled=True, consent_given=False, endpoint="https://x"), "consent"),
        (dict(ai_enabled=True, consent_given=True, endpoint=""), "endpoint"),
    ]:
        with __import__("pytest").raises(AiConsentError, match=match):
            ai_payload([("a.py", "x")], "s", **kwargs)
    # even with everything set, this deployment has no provider — nothing is sent
    with __import__("pytest").raises(AiConsentError, match="never sent"):
        ai_payload([("a.py", "x")], "s", ai_enabled=True, consent_given=True, endpoint="https://x")


def test_bandit_parser_normalizes_rows():
    rows = {"results": [
        {"test_id": "B102", "test_name": "exec_used", "issue_severity": "HIGH",
         "issue_cwe": {"id": 95}, "filename": "a.py", "line_number": "3",
         "code": "exec(x)", "issue_text": "Use of exec"},
        {"test_id": "BROKEN", "line_number": "not-a-number"},
    ]}
    out = parse_bandit_json(rows)
    assert len(out) == 1
    assert out[0].severity == "high" and out[0].cwe == "CWE-95" and out[0].line == 3
