"""Offline sync tests: queue application, conflict preservation, explicit resolution."""
import json

from app import core


def test_applied_when_record_is_new():
    outcome = core.apply_synced_change("note", None, {"payload": {"body": "hi"}, "client_base_ts": ""}, "T1")
    assert outcome.status == "applied"
    assert outcome.record["body"] == "hi"


def test_stale_change_is_conflict_and_never_discards():
    server = {"body": "server text", "updated_at": "T5"}
    outcome = core.apply_synced_change("note", server, {"payload": {"body": "offline text"}, "client_base_ts": "T3"}, "T9")
    assert outcome.status == "conflict"
    # BOTH versions preserved
    assert outcome.server_snapshot["body"] == "server text"
    assert outcome.record["body"] == "server text"


def test_fresh_change_updates():
    server = {"body": "old", "updated_at": "T5"}
    outcome = core.apply_synced_change("note", server, {"payload": {"body": "new"}, "client_base_ts": "T5"}, "T9")
    assert outcome.status == "applied" and outcome.record["body"] == "new"


def test_malformed_changes_rejected_with_reason():
    assert core.apply_synced_change("bad", None, {"payload": {}}, "T").status == "rejected"
    rejected = core.apply_synced_change("note", None, {"payload": "not-a-dict"}, "T")
    assert rejected.status == "rejected" and "reason" in rejected.server_snapshot


def test_conflict_resolutions():
    server = {"body": "server", "pinned": True}
    client = {"body": "client", "extra": "kept"}
    assert core.resolve_conflict("keep_client", server, client)["body"] == "client"
    assert core.resolve_conflict("keep_server", server, client)["body"] == "server"
    merged = core.resolve_conflict("merge", server, client)
    assert "server" in merged["body"] and "client" in merged["body"]
    assert merged["extra"] == "kept"
    assert merged["pinned"] is True


def test_sync_endpoints_roundtrip(authed_client):
    push = authed_client.post("/api/sync", json={
        "kind": "note", "ref_id": 1, "payload": {"body": "offline note"}, "client_ts": "T1", "client_base_ts": "",
    })
    assert push.status_code == 200 and push.json()["status"] == "applied"
    status = authed_client.get("/api/sync/status").json()
    assert status["last_sync"] is not None and status["pending_conflicts"] == 0
