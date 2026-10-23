"""Reporting tests: summaries, persistence, and CSV/JSON export."""


def analyze_and_report(client):
    text = (
        b"Oct 21 08:00:01 host sshd[1]: Accepted password for jchanda from 192.0.2.10 port 1 ssh2\n"
        b"Oct 21 08:01:01 host sshd[2]: Failed password for mbanda from 198.51.100.23 port 2 ssh2\n"
        b"Oct 21 08:01:31 host sshd[2]: Failed password for mbanda from 198.51.100.23 port 2 ssh2\n"
        b"Oct 21 08:02:01 host sshd[2]: Failed password for mbanda from 198.51.100.23 port 2 ssh2\n"
        b"Oct 21 08:02:31 host sshd[2]: Failed password for mbanda from 198.51.100.23 port 2 ssh2\n"
        b"Oct 21 08:03:01 host sshd[2]: Failed password for mbanda from 198.51.100.23 port 2 ssh2\n"
    )
    dataset_id = client.post("/api/datasets", files={"file": ("run.log", text, "text/plain")}).json()["id"]
    client.post(f"/api/datasets/{dataset_id}/analyze")
    report = client.post(f"/api/datasets/{dataset_id}/reports").json()
    return dataset_id, report


def test_report_counts_match_dataset(authed_client):
    _, report = analyze_and_report(authed_client)
    counts = report["summary"]["counts"]
    assert counts["total_events"] == 6
    assert counts["successful_logins"] == 1
    assert counts["failed_logins"] == 5
    assert counts["suspicious_patterns"] >= 1
    assert report["generated_at"]
    assert report["summary"]["dataset"]["id"]


def test_report_is_persisted_and_lists(authed_client):
    dataset_id, report = analyze_and_report(authed_client)
    listed = authed_client.get("/api/reports").json()
    assert len(listed) == 1
    assert listed[0]["id"] == report["id"]
    assert listed[0]["dataset_id"] == dataset_id
    assert listed[0]["generated_at"]


def test_csv_export_contains_rows(authed_client):
    _, report = analyze_and_report(authed_client)
    response = authed_client.get(f"/api/reports/{report['id']}/export.csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    body = response.text
    assert "counts,failed_logins,5" in body
    assert "finding," in body


def test_json_export(authed_client):
    _, report = analyze_and_report(authed_client)
    response = authed_client.get(f"/api/reports/{report['id']}/export.json")
    assert response.status_code == 200
    payload = response.json()
    assert payload["counts"]["failed_logins"] == 5
    assert "disclaimer" in payload


def test_findings_distinguish_pattern_from_incident(authed_client):
    _, _ = analyze_and_report(authed_client)
    dataset_id = authed_client.get("/api/datasets").json()[0]["id"]
    findings = authed_client.get(f"/api/datasets/{dataset_id}/findings").json()
    assert findings
    for finding in findings:
        assert finding["classification"] == "suspicious-pattern"
        assert "not proof of an attack" in finding["explanation"]
