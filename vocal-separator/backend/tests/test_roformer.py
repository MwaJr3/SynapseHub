"""BS-RoFormer adapter: configuration, selection and exact-sum behaviour (no weights needed)."""
import sys
from pathlib import Path
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import engines                                        # noqa: E402

GOOD = "audio:\n  chunk_size: 1000\n  sample_rate: 44100\nmodel:\n  dim: 8\n  depth: 1\n  freqs_per_bands: !!python/tuple [2, 2]\n"


def _cfg(tmp_path, text):
    p = tmp_path / "c.yaml"; p.write_text(text); return p


def test_config_accepts_python_tuple_tags_without_python_execution(tmp_path):
    cfg = engines.RoformerAdapter._read_config(_cfg(tmp_path, GOOD))
    assert cfg["model"]["freqs_per_bands"] == (2, 2)
    with pytest.raises(Exception):                              # arbitrary python tags stay refused
        engines.RoformerAdapter._read_config(_cfg(tmp_path, GOOD + "x: !!python/object/apply:os.getcwd []\n"))


@pytest.mark.parametrize("extra", ["  linear_transformer_depth: 1\n", "  num_stems: 4\n"])
def test_unsupported_architectures_are_rejected(tmp_path, extra):
    with pytest.raises(ValueError):
        engines.RoformerAdapter._read_config(_cfg(tmp_path, GOOD + extra))


def test_unconfigured_roformer_is_unavailable_and_never_selected(monkeypatch):
    monkeypatch.setattr(engines, "ROFORMER_CKPT", ""); monkeypatch.setattr(engines, "ROFORMER_CONFIG", "")
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
