"""Parsing tests: supported formats, malformed input, and upload validation."""
from pathlib import Path

from app import parsing

EXAMPLES = Path(__file__).resolve().parent.parent / "examples"


def test_parse_syslog_sample_extracts_auth_events():
    text = (EXAMPLES / "sample_auth.log").read_text()
    result = parsing.parse_upload("sample_auth.log", text)
    assert result.file_format == "syslog"
    assert result.errors == []
    types = [r.event_type for r in result.records]
    assert types.count("auth_failure") >= 10
    assert types.count("auth_success") >= 3
    failures = [r for r in result.records if r.event_type == "auth_failure"]
    assert all(r.username and r.source_ip for r in failures)
    assert any(r.username == "mbanda" and r.source_ip == "198.51.100.23" for r in failures)


def test_parse_csv_sample_maps_columns():
    text = (EXAMPLES / "sample_events.csv").read_text()
    result = parsing.parse_upload("sample_events.csv", text)
    assert result.file_format == "csv"
    assert result.errors == []
    assert len(result.records) == 8
    assert result.records[0].event_type == "auth_success"
    assert result.records[1].username == "cmwila"


def test_malformed_lines_are_reported_not_fatal():
    text = (EXAMPLES / "malformed_records.log").read_text()
    result = parsing.parse_upload("malformed_records.log", text)
    # No crash; free-form text lines still parse as records with classification.
    assert len(result.records) >= 3
    assert all(r.raw for r in result.records)


def test_csv_with_wrong_header_reports_error():
    result = parsing.parse_upload("bad.csv", "a,b,c\n1,2,3\n")
    assert result.records == []
    assert result.errors and "timestamp or message" in result.errors[0]["reason"]


def test_empty_csv_reports_error():
    result = parsing.parse_upload("empty.csv", "")
    assert result.errors


def test_message_classification():
    assert parsing.classify_message("Failed password for root from 10.0.0.1")[0] == "auth_failure"
    assert parsing.classify_message("Accepted password for root from 10.0.0.1")[0] == "auth_success"
    assert parsing.classify_message("ERROR something broke")[0] == "error"
    assert parsing.classify_message("user opened session")[0] == "info"


def test_upload_rejects_unsupported_extension(authed_client):
    response = authed_client.post("/api/datasets", files={"file": ("evil.exe", b"MZ", "application/octet-stream")})
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_upload_enforces_size_limit(authed_client, monkeypatch):
    from app import config

    monkeypatch.setattr(config, "MAX_UPLOAD_BYTES", 10)
    response = authed_client.post(
        "/api/datasets",
        files={"file": ("big.log", b"x" * 50, "text/plain")},
    )
    assert response.status_code == 413


def test_upload_sanitizes_filenames(authed_client):
    response = authed_client.post(
        "/api/datasets",
        files={"file": ("../../etc/passwd.log", b"Oct 21 08:00:00 host sshd[1]: Accepted password for a from 1.2.3.4\n", "text/plain")},
    )
    assert response.status_code == 200
    datasets = authed_client.get("/api/datasets").json()
    assert datasets[0]["original_filename"] == "passwd.log"
    assert "/" not in datasets[0]["original_filename"]
