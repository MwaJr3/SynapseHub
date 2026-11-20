"""BS-RoFormer adapter: configuration, selection and exact-sum behaviour (no weights needed)."""
import sys
from pathlib import Path
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import engines, roformer                              # noqa: E402

GOOD = "audio:\n  chunk_size: 1000\n  sample_rate: 44100\nmodel:\n  dim: 8\n  depth: 1\n  freqs_per_bands: !!python/tuple [2, 2]\n"


def _cfg(tmp_path, text):
    p = tmp_path / "c.yaml"; p.write_text(text); return p


def test_config_accepts_python_tuple_tags_without_python_execution(tmp_path):
    cfg = roformer.RoformerAdapter._read_config(_cfg(tmp_path, GOOD))
    assert cfg["model"]["freqs_per_bands"] == (2, 2)
    with pytest.raises(Exception):                              # arbitrary python tags stay refused
        roformer.RoformerAdapter._read_config(_cfg(tmp_path, GOOD + "x: !!python/object/apply:os.getcwd []\n"))


@pytest.mark.parametrize("extra", ["  linear_transformer_depth: 1\n", "  num_stems: 4\n"])
def test_unsupported_architectures_are_rejected(tmp_path, extra):
    with pytest.raises(ValueError):
        roformer.RoformerAdapter._read_config(_cfg(tmp_path, GOOD + extra))


def test_unconfigured_roformer_is_unavailable_and_never_selected(monkeypatch):
    monkeypatch.setattr(roformer, "ROFORMER_CKPT", ""); monkeypatch.setattr(roformer, "ROFORMER_CONFIG", "")
    ok, why = engines.REGISTRY["roformer"].available()
    assert not ok and "not configured" in why
    with pytest.raises(RuntimeError):
        engines.select_engine("roformer", ["vocals"])
    eng, _ = engines.select_engine("auto", ["vocals"])
    assert eng.name != "bs-roformer"


def test_auto_prefers_roformer_when_available(monkeypatch):
    monkeypatch.setattr(engines.REGISTRY["roformer"], "available", lambda: (True, "ok"))
    assert engines.select_engine("auto", ["vocals"])[0].name == "bs-roformer"
    assert engines.select_engine("dsp", ["vocals"])[0].name == "dsp-softmask"


def test_stems_sum_exactly_to_the_mix(monkeypatch):
    sr = 22050
    rng = np.random.default_rng(1)
    mix = (rng.standard_normal((2, sr * 3)) * 0.1).astype(np.float32)
    ad = engines.REGISTRY["roformer"]
    monkeypatch.setattr(ad, "available", lambda: (True, "ok"))
    monkeypatch.setattr(ad, "_vocals", lambda audio, sr_, q, progress: (audio * 0.4).astype(np.float32))
    res = ad.separate(mix, sr, ["vocals", "drums", "bass", "other"], "fast")
    assert set(res.stems) == {"vocals", "drums", "bass", "other"}
    assert float(np.abs(sum(res.stems.values()) - mix).max()) < 1e-5
    assert any("DSP" in w for w in res.warnings)


# ---------------------------------------------------------------- inference mechanics
@pytest.mark.parametrize("n,chunk,ov", [(100, 100, .5), (50, 100, .5), (1000, 100, .5), (1001, 100, .125), (5000, 352, .75)])
def test_chunk_plan_covers_every_sample_with_full_chunks(n, chunk, ov):
    starts = roformer.RoformerAdapter.plan_chunks(n, chunk, ov)
    assert starts == sorted(set(starts)) and starts[0] == 0
    if n > chunk:
        assert starts[-1] + chunk == n, "last chunk must end exactly at the end"
        assert all(b - a <= chunk for a, b in zip(starts, starts[1:])), "gap between chunks"


def test_lower_overlap_means_fewer_model_calls():
    plan = lambda f: len(roformer.RoformerAdapter.plan_chunks(44100 * 120, 352800, f))
    assert plan(.125) < plan(.25) < plan(.5) < plan(.75)


class _Identity:
    """Stands in for the network: returns its input, counting calls."""
    calls = 0
    def __call__(self, x):
        _Identity.calls += 1
        return x


def _fake(monkeypatch, quality_cfg=None):
    ad = roformer.RoformerAdapter()
    monkeypatch.setattr(ad, "_load", lambda: (_Identity(), {"audio": {"chunk_size": 1000, "sample_rate": 8000}}))
    monkeypatch.setattr(ad, "_device", lambda: __import__("torch").device("cpu"))
    monkeypatch.setattr(ad, "_precision", lambda: None)
    _Identity.calls = 0
    return ad


@pytest.mark.parametrize("n", [700, 1000, 2345, 5000])
def test_overlap_add_reconstructs_input_through_an_identity_model(monkeypatch, n):
    ad = _fake(monkeypatch)
    x = (np.random.default_rng(3).standard_normal((2, n)) * 0.2).astype(np.float32)
    y = ad._vocals(x, 8000, "high", lambda f, m: None)
    assert y.shape == x.shape and float(np.abs(y - x).max()) < 1e-4


def test_silent_chunks_skip_the_model(monkeypatch):
    ad = _fake(monkeypatch)
    x = np.zeros((2, 4000), np.float32); x[:, 3000:] = 0.3
    y = ad._vocals(x, 8000, "fast", lambda f, m: None)
    assert _Identity.calls < len(ad.plan_chunks(4000, 1000, ad.OVERLAP_FRACTION["fast"]))
    assert float(np.abs(y[:, :1000]).max()) == 0.0


def test_mono_input_stays_mono(monkeypatch):
    ad = _fake(monkeypatch)
    x = (np.random.default_rng(4).standard_normal((1, 2500)) * 0.2).astype(np.float32)
    assert ad._vocals(x, 8000, "fast", lambda f, m: None).shape == (1, 2500)


def test_precision_override_and_fp32_fallback(monkeypatch):
    ad = roformer.RoformerAdapter()
    monkeypatch.setattr(roformer, "ROFORMER_PRECISION", "fp32")
    assert ad._precision() is None
    monkeypatch.setattr(roformer, "ROFORMER_PRECISION", "auto")
    monkeypatch.setattr(roformer, "_cpu_has_bf16", lambda: False)
    monkeypatch.setattr(ad, "_device", lambda: __import__("torch").device("cpu"))
    assert ad._precision() is None, "no hardware bf16 -> stay in fp32 (bf16 would be slower)"
    monkeypatch.setattr(roformer, "_cpu_has_bf16", lambda: True)
    assert ad._precision()[0] == "cpu"
