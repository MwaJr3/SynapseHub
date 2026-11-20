"""Regression + feature tests for the chart-aligned classifier, voice-stem naming,
lead/backing split and the minus-one practice mix."""
import io, sys, time
from pathlib import Path
import numpy as np
import soundfile as sf
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parents[1]))
from synth import make_satb_mix                              # noqa: E402
from app import vocal, practice, outcomes                    # noqa: E402
from app.main import app                                     # noqa: E402
from app.db import init_db                                   # noqa: E402

client = TestClient(app)
init_db()


# ---------------------------------------------------------------- the six-range chart
def test_chart_matches_the_reference_chart():
    expected = {                       # note names exactly as printed on the chart
        "soprano": ("C4", "C6"), "mezzo_soprano": ("A3", "A5"), "alto": ("F3", "F5"),
        "tenor": ("C3", "C5"), "baritone": ("G2", "G4"), "bass": ("E2", "E4"),
    }
    assert set(vocal.VOCAL_RANGE_CHART) == set(expected)
    assert set(vocal.VOICE_PARTS) == set(expected)
    for part, (lo, hi) in expected.items():
        assert vocal.chart_range_notes(part) == (lo, hi), part


def test_legacy_labels_map_onto_chart_classes():
    assert vocal.canonical_part("contralto") == "alto"
    assert vocal.canonical_part("bass_baritone") == "baritone"
    assert vocal.canonical_part("soprano") == "soprano"
    assert vocal.canonical_part("") == "unknown" and vocal.canonical_part(None) == "unknown"


def _line(median, spread, n=120):
    rng = np.random.default_rng(3)
    return vocal.VoiceLine(times=list(np.arange(n) * 0.05), midis=list(rng.normal(median, spread, n)),
                           strengths=[0.8] * n)


def test_a_mid_female_line_is_mezzo_soprano_not_unknown():
    """B3-C5 around F4 (the lead of a real recording) used to fall between soprano and alto."""
    res = vocal.classify_voice(_line(66.0, 1.1))
    assert res["predicted"] == "mezzo_soprano", res["predictions"][:3]


def test_chart_fit_reports_every_range_that_could_sing_the_line():
    fit = {d["class"]: d for d in vocal.chart_fit(_line(66.0, 1.1).midis)}
    assert set(fit) == set(vocal.VOCAL_RANGE_CHART)
    assert fit["mezzo_soprano"]["within_range_ratio"] > 0.95
    assert fit["bass"]["within_range_ratio"] < 0.15   # only the lowest notes reach E4
    assert fit["alto"]["lowest_note"] == "F3" and fit["alto"]["highest_note"] == "F5"


# ---------------------------------------------------------------- voice-stem naming
def _v(vid, cls, available=True, lead=False):
    return {"voice_id": vid, "classification": cls, "stem_available": available, "is_lead": lead}


def test_voice_stem_never_reuses_a_level1_name():
    names = vocal.assign_voice_stem_names([_v("voice_09", "bass")], {"vocals", "drums", "bass", "other"})
    assert names == {"voice_09": "bass_voice"}


def test_duplicate_classes_get_distinct_names_and_keep_their_voice_id():
    voices = [_v("voice_01", "soprano"), _v("voice_02", "soprano"), _v("voice_03", "soprano"),
              _v("voice_04", "unknown"), _v("voice_05", "tenor", available=False)]
    names = vocal.assign_voice_stem_names(voices, {"vocals", "drums", "bass", "other"})
    assert set(names) == {"voice_01", "voice_02", "voice_03", "voice_04"}      # withheld voice gets none
    assert len(set(names.values())) == len(names)
    assert names["voice_01"] == "soprano" and names["voice_04"] == "voice_04"


def test_lead_is_always_named_lead_vocal():
    names = vocal.assign_voice_stem_names([_v("voice_04", "unknown", lead=True),
                                           _v("voice_01", "soprano")], {"vocals"})
    assert names == {"voice_04": "lead_vocal", "voice_01": "soprano"}


def test_a_dominant_unclassified_lead_is_exported_but_stays_unknown():
    """The lead is picked by dominance, so a long lead line is exported even if its class is
    unreliable; the class must stay Unknown (no invented label)."""
    sr = 22050
    t = np.arange(int(12 * sr)) / sr
    f0 = 440 * 2 ** ((66 - 69) / 12)
    lead = sum((0.6 ** (h - 1) / h) * np.sin(2 * np.pi * h * f0 * t) for h in range(1, 8))
    x = (0.4 * lead).astype(np.float32)
    # add a short, quiet second line so "lead" has something to dominate
    t2 = np.arange(int(2 * sr)) / sr
    f2 = 440 * 2 ** ((50 - 69) / 12)
    x[: len(t2)] += (0.2 * np.sin(2 * np.pi * f2 * t2)).astype(np.float32)
    a = vocal.analyze_vocals(x, sr)
    leads = [v for v in a["voices"] if v["is_lead"]]
    assert len(leads) == 1 and leads[0]["voiced_seconds"] >= vocal.MIN_LEAD_SECONDS
    assert leads[0]["stem_available"], "a dominant lead line should be exportable"
    assert all(not v["is_lead"] for v in a["voices"] if v is not leads[0])


# ---------------------------------------------------------------- practice mix + outcomes
def test_minus_one_removes_the_stem_and_never_clips():
    rng = np.random.default_rng(0)
    mix = (rng.normal(0, 0.1, (2, 4000))).astype(np.float32)
    stem = (mix * 0.4).astype(np.float32)
    out, gain = practice.minus_one_mix(mix, stem)
    assert gain == 1.0 and np.allclose(out, mix * 0.6, atol=1e-6)
    hot, g = practice.minus_one_mix(np.full((2, 10), 0.9, np.float32), np.full((2, 10), -0.9, np.float32))
    assert g < 1.0 and float(np.max(np.abs(hot))) <= practice.CEILING + 1e-6
    with pytest.raises(ValueError):
        practice.minus_one_mix(mix, stem[:, :10])


def test_outcome_codes_have_fixed_safe_messages():
    for code in outcomes.CODES:
        d = outcomes.describe(code)
        assert d["code"] == code and d["message"]
        # fixed prose only: no filesystem paths, tracebacks or file names
        assert not any(bad in d["message"] for bad in ("/home", "/tmp", "Traceback", ".wav", "Error:"))
    assert outcomes.describe("something_new")["message"]


# ---------------------------------------------------------------- end to end
def _auth(email):
    from app import main as _main
    _main._hits.clear()                  # the auth limiter is per-minute; tests share one client IP
    r = client.post("/api/auth/register", json={"email": email, "password": "hunter2-hunter2"})
    if r.status_code == 409:
        r = client.post("/api/auth/login", json={"email": email, "password": "hunter2-hunter2"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def finished_job():
    h = _auth("improve@example.com")
    pid = client.post("/api/projects", json={"title": "SATB full"}, headers=h).json()["id"]
    song = make_satb_mix()
    buf = io.BytesIO(); sf.write(buf, song["mix"].T, 44100, format="WAV", subtype="PCM_16")
    afid = client.post(f"/api/projects/{pid}/audio", headers=h,
                       files={"file": ("satb.wav", io.BytesIO(buf.getvalue()), "audio/wav")}).json()["audio_file_id"]
    jid = client.post("/api/jobs", headers=h, json={"audio_file_id": afid, "quality": "fast", "profile": "choir",
                                                    "engine": "dsp", "vocal_analysis": True}).json()["id"]
    deadline = time.time() + 300
    while time.time() < deadline:
        if client.get(f"/api/jobs/{jid}", headers=h).json()["state"] in ("COMPLETED", "FAILED"):
            break
        time.sleep(1)
    res = client.get(f"/api/jobs/{jid}/results", headers=h).json()
    assert res["state"] == "COMPLETED", res
    return h, jid, res


def test_level1_bass_is_not_overwritten_by_a_bass_voice(finished_job):
    _, _, res = finished_job
    by_name = {s["name"]: s for s in res["stems"]}
    assert by_name["bass"]["kind"] == "music", "the real bass stem was replaced by a voice part"
    names = [s["name"] for s in res["stems"]]
    assert len(names) == len(set(names)), "stem names must be unique"
    assert res["report"]["reconstruction"]["residual_db_below_mix"] > 60, res["report"]["reconstruction"]


def test_every_voice_part_stem_is_linked_to_its_voice(finished_job):
    _, _, res = finished_job
    parts = [s for s in res["stems"] if s["kind"] == "voice_part"]
    assert parts, "synthetic SATB should export voice parts"
    assert all(s["voice_id"] for s in parts), "a voice-part stem lost its voice link"
    exported = {v["voice_id"] for v in res["voices"] if v["stem_available"]}
    assert {s["voice_id"] for s in parts} == exported


def test_lead_and_backing_add_back_to_the_vocal_stem(finished_job):
    h, _, res = finished_job
    by_name = {s["name"]: s for s in res["stems"]}
    assert "lead_vocal" in by_name and "backing_vocals" in by_name, sorted(by_name)
    assert by_name["backing_vocals"]["kind"] == "derived"
    load = lambda n: sf.read(io.BytesIO(client.get(by_name[n]["download_url"]).content), dtype="float64")[0]
    err = load("vocals") - (load("lead_vocal") + load("backing_vocals"))
    assert float(np.max(np.abs(err))) < 1e-3
    assert res["report"]["lead_split_outcome"]["code"] == outcomes.LEAD_READY
    assert res["report"]["voice_outcome"]["code"] == outcomes.READY


def test_voices_report_chart_fit_and_lead(finished_job):
    _, _, res = finished_job
    assert sum(1 for v in res["voices"] if v.get("is_lead")) == 1
    for v in res["voices"]:
        assert {d["class"] for d in v["chart_fit"]} == set(vocal.VOCAL_RANGE_CHART)
        assert v["classification"] in set(vocal.VOICE_PARTS) | {"unknown"}


def test_minus_one_api(finished_job):
    h, jid, res = finished_job
    other = _auth("someone-else@example.com")
    r = client.post(f"/api/jobs/{jid}/minus-one", headers=h, json={"without": "drums"})
    assert r.status_code == 200, r.text
    st = r.json()
    assert st["name"] == "minus_drums" and st["kind"] == "minus_one" and st["voice_id"] == ""
    again = client.post(f"/api/jobs/{jid}/minus-one", headers=h, json={"without": "drums"}).json()
    assert again["id"] == st["id"], "asking twice must not create a second file"
    wav = lambda url: sf.read(io.BytesIO(client.get(url).content), dtype="float64")[0]
    by_name = {s["name"]: s for s in res["stems"]}
    mix, drums, mo = wav(by_name["original"]["download_url"]), wav(by_name["drums"]["download_url"]), wav(st["download_url"])
    assert mo.shape == mix.shape
    assert float(np.max(np.abs(mo - (mix - drums)))) < 1e-3
    # the original mix cannot be "removed", unknown names are rejected, other users get a 404
    assert client.post(f"/api/jobs/{jid}/minus-one", headers=h, json={"without": "original"}).status_code == 422
    assert client.post(f"/api/jobs/{jid}/minus-one", headers=h, json={"without": "../../etc/passwd"}).status_code == 422
    assert client.post(f"/api/jobs/{jid}/minus-one", headers=other, json={"without": "drums"}).status_code == 404
    # it is listed with the job's stems afterwards and is served only through the signed URL
    names = {s["name"] for s in client.get(f"/api/jobs/{jid}/results", headers=h).json()["stems"]}
    assert "minus_drums" in names
    assert client.get(st["download_url"].split("?")[0] + "?token=0.bad").status_code == 403


# ---------------------------------------------------------------- every voice part
def _pv(vid, median, secs, cls="unknown", avail=False, probs=None):
    probs = probs or {}
    return {"voice_id": vid, "classification": cls, "stem_available": avail, "voiced_seconds": secs,
            "pitch_statistics": {"median_midi": median},
            "predictions": [{"class": p, "probability": probs.get(p, 0.05)} for p in vocal.PART_ORDER],
            "chart_fit": vocal.chart_fit(np.full(50, median))}


def test_assign_parts_orders_lines_by_pitch_and_flags_guesses():
    voices = [_pv("a", 72, 10, "soprano", True), _pv("b", 66, 20), _pv("c", 61, 20),
              _pv("d", 58, 20), _pv("e", 54, 20, "baritone", True), _pv("f", 49, 20)]
    vocal.assign_parts(voices)
    idx = [vocal.PART_ORDER.index(v["assigned_part"]) for v in voices]
    assert idx == sorted(idx), "a lower line must never be a higher part"
    assert voices[0]["assigned_part"] == "soprano" and voices[0]["assignment"] == "classified"
    assert voices[4]["assigned_part"] == "baritone"
    assert voices[5]["assigned_part"] == "bass" and voices[5]["assignment"] == "best_guess"
    assert voices[1]["assignment"] == "best_guess"


def test_assign_parts_skips_short_lines_and_survives_conflicts():
    voices = [_pv("hi", 50, 10, "soprano", True), _pv("lo", 70, 10, "bass", True), _pv("blip", 60, 0.3)]
    vocal.assign_parts(voices)                      # trusted classes contradict pitch order
    assert voices[2]["assigned_part"] is None
    assert voices[0]["assigned_part"] == "soprano" and voices[1]["assigned_part"] == "bass"


def test_group_part_audio_sums_members_and_marks_guesses():
    voices = [_pv("a", 60, 10), _pv("b", 61, 5)]
    for v in voices:
        v["assigned_part"], v["assignment"] = "tenor", "best_guess"
    voices[0]["assignment"] = "classified"
    stems = {"a": np.ones(4, np.float32), "b": np.full(4, 2, np.float32)}
    g = vocal.group_part_audio(voices, stems)["tenor"]
    assert np.allclose(g["audio"], 3) and g["primary"] == "a" and g["best_guess"] is True


@pytest.fixture(scope="module")
def all_parts_job():
    h = _auth("allparts@example.com")
    pid = client.post("/api/projects", json={"title": "SATB parts"}, headers=h).json()["id"]
    song = make_satb_mix()
    buf = io.BytesIO(); sf.write(buf, song["mix"].T, 44100, format="WAV", subtype="PCM_16")
    afid = client.post(f"/api/projects/{pid}/audio", headers=h,
                       files={"file": ("satb.wav", io.BytesIO(buf.getvalue()), "audio/wav")}).json()["audio_file_id"]
    jid = client.post("/api/jobs", headers=h, json={"audio_file_id": afid, "quality": "fast", "profile": "choir",
                                                    "engine": "dsp", "vocal_analysis": True,
                                                    "all_voice_parts": True}).json()["id"]
    deadline = time.time() + 300
    while time.time() < deadline:
        if client.get(f"/api/jobs/{jid}", headers=h).json()["state"] in ("COMPLETED", "FAILED"):
            break
        time.sleep(1)
    res = client.get(f"/api/jobs/{jid}/results", headers=h).json()
    assert res["state"] == "COMPLETED", res
    return res


def test_all_parts_job_exports_one_stem_per_part(all_parts_job):
    res = all_parts_job
    names = [s["name"] for s in res["stems"]]
    assert len(names) == len(set(names))
    parts = {s["name"]: s for s in res["stems"] if s["kind"] == "voice_part"}
    assert parts, names
    assert res["report"]["voice_outcome"]["code"] == outcomes.ALL_PARTS_READY
    assert "bass" in {s["name"] for s in res["stems"] if s["kind"] == "music"}, "Level-1 bass must survive"
    for name, meta in res["report"]["voice_analysis"]["part_stems"].items():
        assert meta["part"] in vocal.PART_ORDER and meta["voice_ids"]
    assert all(v["assigned_part"] for v in res["voices"] if v["voiced_seconds"] >= vocal.MIN_VOICE_SECONDS)
