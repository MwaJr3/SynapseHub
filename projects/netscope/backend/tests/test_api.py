import time

from conftest import build_pcap, eth_ip

PCAP = build_pcap([
    eth_ip("10.0.0.1", "10.0.0.2", 6, b"x" * 40, 1234, 80),
    eth_ip("10.0.0.1", "10.0.0.2", 17, b"y" * 10, 53, 53),
])


def upload(auth_client, name="cap.pcap", data=PCAP):
    return auth_client.post("/api/captures?label=lab capture",
                            files={"file": (name, data, "application/vnd.tcpdump.pcap")})


def test_upload_analyze_and_report_with_pseudonymisation(auth_client):
    r = upload(auth_client)
    assert r.status_code == 200 and r.json()["status"] == "completed"
    cap_id = r.json()["id"]
    detail = auth_client.get(f"/api/captures/{cap_id}").json()
    assert detail["summary"]["packets"] == 2
    assert "never inspected" in detail["disclaimer"]
    report = auth_client.get(f"/api/captures/{cap_id}/report").json()
    assert "10.0.0.1" not in str(report["summary"]["top_sources"])   # redacted by default
    raw = auth_client.get(f"/api/captures/{cap_id}?redact=false").json()
    assert "10.0.0.1" in str(raw["summary"]["top_sources"])


def test_background_processing_path(auth_client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "inline_max_bytes", 0)   # force the background path
    r = upload(auth_client)
    assert r.json()["status"] in ("processing", "completed")
    cap_id = r.json()["id"]
    for _ in range(50):
        if auth_client.get(f"/api/captures/{cap_id}").json()["status"] == "completed":
            break
        time.sleep(0.05)
    detail = auth_client.get(f"/api/captures/{cap_id}").json()
    assert detail["status"] == "completed"
    assert detail["summary"]["packets"] == 2


def test_malformed_upload_marks_failed_not_crash(auth_client):
    r = upload(auth_client, name="bad.pcap", data=b"garbage not pcap")
    cap_id = r.json()["id"]
    detail = auth_client.get(f"/api/captures/{cap_id}").json()
    assert detail["status"] == "failed" and detail["error"]


def test_compare_reports_deltas_as_indicators(auth_client):
    a = upload(auth_client, name="a.pcap").json()["id"]
    b = upload(auth_client, name="b.pcap",
               data=build_pcap([eth_ip("10.0.0.9", "10.0.0.2", 6, b"z", 1, 443)])).json()["id"]
    d = auth_client.get(f"/api/compare?base_id={a}&compare_id={b}").json()
    assert "not confirmed attacks" in d["note"]
    assert "protocol_volume_delta" in d


def test_crud_and_ownership(auth_client):
    from fastapi.testclient import TestClient
    from app.main import app
    cap_id = upload(auth_client).json()["id"]
    assert auth_client.patch(f"/api/captures/{cap_id}", json={"label": "renamed"}).json()["label"] == "renamed"
    anon = TestClient(app)
    assert anon.get(f"/api/captures/{cap_id}").status_code == 401
    assert auth_client.delete(f"/api/captures/{cap_id}").json()["ok"] is True
