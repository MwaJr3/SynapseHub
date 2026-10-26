"""End-to-end API test (§89): register → project → upload → job → results → download.
Also checks owner isolation (§84) and signed-URL enforcement."""
import io, sys, time
from pathlib import Path
import numpy as np
import soundfile as sf
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parents[1]))
from synth import make_satb_mix          # noqa: E402
from app.main import app                 # noqa: E402
from app.db import init_db               # noqa: E402

client = TestClient(app)
init_db()


def _auth(email):
    r = client.post("/api/auth/register", json={"email": email, "password": "hunter2-hunter2"})
    if r.status_code == 409:
        r = client.post("/api/auth/login", json={"email": email, "password": "hunter2-hunter2"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_rejects_fake_audio():
    h = _auth("fake@example.com")
    pid = client.post("/api/projects", json={"title": "t"}, headers=h).json()["id"]
    r = client.post(f"/api/projects/{pid}/audio", headers=h,
                    files={"file": ("song.mp3", io.BytesIO(b"not audio at all"), "audio/mpeg")})
    assert r.status_code == 422            # magic-byte sniff, not extension trust (§5)


@pytest.mark.timeout(600) if hasattr(pytest.mark, "timeout") else pytest.mark.skip
def test_full_flow():
    h = _auth("flow@example.com")
    other = _auth("other@example.com")
    pid = client.post("/api/projects", json={"title": "SATB test"}, headers=h).json()["id"]
    song = make_satb_mix()
    buf = io.BytesIO()
    sf.write(buf, song["mix"][:, :4 * 44100].T, 44100, format="WAV", subtype="PCM_16")
    r = client.post(f"/api/projects/{pid}/audio", headers=h,
                    files={"file": ("satb.wav", io.BytesIO(buf.getvalue()), "audio/wav")})
    assert r.status_code == 200, r.text
    afid = r.json()["audio_file_id"]
    assert r.json()["meta"]["duration"] > 3.9
    r = client.post("/api/jobs", headers=h, json={
        "audio_file_id": afid, "quality": "fast", "profile": "choir",
        "engine": "dsp", "vocal_analysis": True})
    assert r.status_code == 200, r.text
    jid = r.json()["id"]
    # another user must not see this job (owner isolation)
    assert client.get(f"/api/jobs/{jid}", headers=other).status_code == 404
    deadline = time.time() + 540
    while time.time() < deadline:
        state = client.get(f"/api/jobs/{jid}", headers=h).json()["state"]
        if state in ("COMPLETED", "FAILED"):
            break
        time.sleep(2)
    assert state == "COMPLETED", client.get(f"/api/jobs/{jid}", headers=h).json()
    res = client.get(f"/api/jobs/{jid}/results", headers=h).json()
    names = {s["name"] for s in res["stems"]}
    assert {"original", "vocals", "drums", "bass", "other"} <= names, names
    assert res["voices"], "voice analysis should report detected lines"
    vocals_stem = next(s for s in res["stems"] if s["name"] == "vocals")
    # Browser <audio> elements and download anchors cannot send Bearer headers:
    # the signed capability URL must therefore work on its own, while a
    # tampered capability must not.
    stream = client.get(vocals_stem["stream_url"])
    assert stream.status_code == 200 and len(stream.content) > 1000
    dl = client.get(vocals_stem["download_url"])
    assert dl.status_code == 200 and len(dl.content) > 10000
    bad = client.get(vocals_stem["download_url"].split("?")[0] + "?token=0.bad")
    assert bad.status_code == 403
    zr = client.post("/api/exports", headers=h, json={"job_id": jid, "format": "WAV"})
    assert zr.status_code == 200, zr.text
    z = client.get(zr.json()["download_url"])
    assert z.status_code == 200 and z.content[:2] == b"PK"
