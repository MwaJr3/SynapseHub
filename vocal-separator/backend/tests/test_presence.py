import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import presence                                       # noqa: E402

SR = 8000


def _tone(f, secs=4, amp=0.3):
    t = np.arange(int(SR * secs)) / SR
    return np.stack([amp * np.sin(2 * np.pi * f * t)] * 2).astype(np.float32)


def _stems(vocals, drums=None, bass=None, other=None):
    z = np.zeros_like(vocals)
    return {"vocals": vocals, "drums": z if drums is None else drums, "bass": z if bass is None else bass,
            "other": z if other is None else other}


def test_voices_only_is_a_cappella_and_drops_empty_stems():
    v = _tone(440); st = _stems(v, other=v * 0.01)
    rep = presence.analyse_instrumentation(v + st["other"], st, SR, reliable=True)
    assert rep["kind"] == "a_cappella" and rep["confidence"] == "high"
    assert presence.absent_stems(rep) == ["drums", "bass", "other"]


def test_instruments_present_are_kept():
    v = _tone(440, amp=0.2); b = _tone(80, amp=0.3)
    rep = presence.analyse_instrumentation(v + b, _stems(v, bass=b), SR, reliable=True)
    assert rep["kind"] == "vocals_with_instruments"
    assert rep["stems"]["bass"]["present"] and "bass" not in presence.absent_stems(rep)


def test_no_vocals_means_instrumental_only():
    v = _tone(440, amp=0.001); b = _tone(80, amp=0.3)
    rep = presence.analyse_instrumentation(v + b, _stems(v, bass=b), SR, reliable=True)
    assert rep["kind"] == "instrumental_only"


def test_unreliable_engine_never_removes_a_stem():
    v = _tone(440); st = _stems(v)
    rep = presence.analyse_instrumentation(v, st, SR, reliable=False)
    assert rep["confidence"] == "low" and presence.absent_stems(rep) == []
    assert "rough estimate" in rep["note"]
