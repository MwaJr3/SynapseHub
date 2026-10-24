def seed_feed(auth_client, kind="file", name="blocklist-a"):
    return auth_client.post("/api/feeds", json={"name": name, "kind": kind}).json()["id"]


def test_ingest_dedup_merges_sources(auth_client):
    feed_a = seed_feed(auth_client, name="feed-a")
    feed_b = seed_feed(auth_client, name="feed-b")
    r1 = auth_client.post("/api/ingest/file", json={"feed_id": feed_a, "text": "evil.example\n8.8.8.8"})
    assert r1.json()["new"] == 2 and r1.json()["merged"] == 0
    r2 = auth_client.post("/api/ingest/file", json={"feed_id": feed_b, "text": "EVIL.example\n"})
    assert r2.json()["new"] == 0 and r2.json()["merged"] == 1
    rows = auth_client.get("/api/indicators").json()["indicators"]
    target = next(r for r in rows if r["value"] == "evil.example")
    assert target["source_count"] == 2 and set(target["sources"]) == {"feed-a", "feed-b"}
    assert "not proof" in target["framing"]


def test_simulated_feed_run_is_labelled(auth_client):
    feed = seed_feed(auth_client, kind="simulated", name="demo-feed")
    run = auth_client.post(f"/api/feeds/{feed}/run").json()
    assert "SIMULATED" in run["note"]
    runs = auth_client.get(f"/api/feeds/{feed}/runs").json()["runs"]
    assert runs and "SIMULATED" in runs[0]["note"]


def test_triage_states_and_case_linking(auth_client):
    feed = seed_feed(auth_client)
    auth_client.post("/api/ingest/file", json={"feed_id": feed, "text": "bad.example"})
    row = auth_client.get("/api/indicators").json()["indicators"][0]
    r = auth_client.patch(f"/api/indicators/{row['id']}",
                          json={"triage": "false-positive", "case_ref": "CASE-7", "notes": "lab fixture"})
    assert r.json()["triage"] == "false-positive" and r.json()["case_ref"] == "CASE-7"
    assert auth_client.patch(f"/api/indicators/{row['id']}", json={"triage": "evil"}).status_code == 422
    report = auth_client.get(f"/api/indicators/{row['id']}/report").json()
    assert "NOT proof of maliciousness" in report["disclaimer"]


def test_report_language_and_auth_required(auth_client):
    from fastapi.testclient import TestClient
    from app.main import app
    assert TestClient(app).get("/api/indicators").status_code == 401
    feed = seed_feed(auth_client)
    auth_client.post("/api/ingest/file", json={"feed_id": feed, "text": "x.example"})
    detail = auth_client.get("/api/indicators").json()
    assert "NOT proof" in detail["disclaimer"] and "NOT proof of safety" in detail["disclaimer"]
