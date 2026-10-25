"""Ground-truth tests on a synthetic SATB mix (§89/90). Favourable conditions
(centre voices) — these verify engine correctness, not commercial-audio quality."""
import sys
from pathlib import Path
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parents[1]))
from synth import make_satb_mix                      # noqa: E402
from app import engines, vocal, dsp                  # noqa: E402
from app.audio_io import to_mono                     # noqa: E402


def snr_db(ref, est):
    ref, est = ref.astype(np.float64), est.astype(np.float64)
    gain = np.dot(ref, est) / (np.dot(est, est) + 1e-20)     # optimal gain
    err = ref - gain * est
    return 10 * np.log10(np.sum(ref**2) / (np.sum(err**2) + 1e-20))


@pytest.fixture(scope="module")
def song():
    return make_satb_mix()


def test_dsp_stems_sum_exactly_to_mix(song):
    eng = engines.DSPEngine()
    res = eng.separate(song["mix"], song["sr"], ["vocals", "drums", "bass", "other"], "fast")
    total = sum(res.stems[k] for k in ("vocals", "drums", "bass", "other"))
    resid_db = dsp.dbfs(song["mix"]) - dsp.dbfs(song["mix"] - total)
    assert resid_db > 60, f"reconstruction residual only {resid_db:.1f} dB below mix"
    for k, v in res.stems.items():
        assert v.shape == song["mix"].shape, f"{k} lost sample alignment"


def test_dsp_vocal_stem_prefers_true_vocals(song):
    eng = engines.DSPEngine()
    res = eng.separate(song["mix"], song["sr"], ["vocals", "drums", "bass", "other"], "fast")
    v = to_mono(res.stems["vocals"])
    true_v = to_mono(song["vocal_mix"]); true_a = to_mono(song["accompaniment"])
    assert snr_db(true_v, v) > snr_db(true_a, v), "vocal stem should resemble voices more than accompaniment"
    assert snr_db(true_v, v) > -2.0, "vocal stem should retain substantial true vocal energy"


def test_vocal_analysis_finds_satb_lines(song):
    a = vocal.analyze_vocals(to_mono(song["vocal_mix"]), song["sr"])
    assert 3 <= a["estimated_voice_count"] <= 6, a["estimated_voice_count"]
    assert a["max_simultaneous_voices"] >= 3
    medians = sorted(v["pitch_statistics"]["median_midi"] for v in a["voices"])
    assert medians[0] < 52, "lowest line should sit in bass territory"
    assert medians[-1] > 66, "highest line should sit in soprano territory"
    labels = {v["classification"] for v in a["voices"]}
    assert "soprano" in labels, labels
    assert labels & {"bass", "bass_baritone", "baritone"}, labels


def test_harmonic_reconstruction_improves_soprano_snr(song):
    a = vocal.analyze_vocals(to_mono(song["vocal_mix"]), song["sr"])
    sop = next((v for v in a["voices"] if v["classification"] == "soprano" and v["stem_available"]), None)
    assert sop is not None, "a soprano part should clear the confidence gate on clean synthetic SATB"
    stems = vocal.reconstruct_voice_stems(song["vocal_mix"], song["sr"], a)
    est = to_mono(stems[sop["voice_id"]])
    true = song["voices"]["soprano"] * 0.5                    # mix gain used in synth
    n = min(len(est), len(true))
    mix_snr = snr_db(true[:n], to_mono(song["vocal_mix"])[:n])
    est_snr = snr_db(true[:n], est[:n])
    assert est_snr > mix_snr + 2, f"expected ≥2 dB improvement, mix {mix_snr:.1f} vs stem {est_snr:.1f}"


def test_short_fragment_yields_no_fabricated_part():
    sr = 44100; t = np.arange(int(0.5 * sr)) / sr
    x = (0.4 * np.sin(2 * np.pi * 440 * t) + 0.2 * np.sin(2 * np.pi * 880 * t)).astype(np.float32)
    a = vocal.analyze_vocals(x, sr)
    assert all(not v["stem_available"] for v in a["voices"])  # §20/71: evidence gate


def test_unknown_is_a_valid_result_for_ambiguous_line():
    from app.vocal import VoiceLine, classify_voice
    rng = np.random.default_rng(1)
    line = VoiceLine(times=list(np.arange(0, 3, 0.05)),
                     midis=list(rng.normal(60.2, 3.5, 60)), strengths=[0.7] * 60)
    res = classify_voice(line)
    top2 = [p["class"] for p in res["predictions"][:2]]
    assert set(top2) <= {"contralto", "tenor", "alto", "baritone"}   # genuinely ambiguous zone
    assert res["predictions"][0]["probability"] < 0.6               # must not feign certainty
