"""Level-1 source-separation engines behind one interface (§7/11/13).

Engines:
  * DemucsAdapter  — real ML separation when `demucs` + weights are available.
  * DSPEngine      — real classical-DSP separation (STFT soft-mask partition:
                     centre/harmonicity vocal mask, percussive drums mask,
                     low-band harmonic bass mask, residual = other).
                     Stems always sum exactly to the mix; quality is honestly
                     lower than a trained model and is labelled as such.
  * SpleeterAdapter/MdxAdapter — registered but report unavailable unless their
                     packages are installed (never faked).

Selection (§120): `auto` prefers Demucs; on ANY Demucs failure the pipeline
falls back to DSPEngine and records a user-visible warning.
"""
from __future__ import annotations
import importlib.util, subprocess, sys, tempfile
from dataclasses import dataclass, field
from pathlib import Path
import numpy as np
from scipy.ndimage import median_filter

from . import dsp, audio_io
from .config import DEMUCS_MODEL

QUALITY_PRESETS = {
    # n_fft, hop, median kernel, mask power
    "fast":     dict(n_fft=1024, hop=256, med=9,  power=1.0),
    "balanced": dict(n_fft=2048, hop=512, med=17, power=1.5),
    "high":     dict(n_fft=4096, hop=1024, med=21, power=2.0),
    "maximum":  dict(n_fft=4096, hop=512, med=25, power=2.0),
}
PROFILES = {
    "vocals_instrumental": ["vocals", "instrumental"],
    "full":                ["vocals", "drums", "bass", "other"],
    "extended":            ["vocals", "drums", "bass", "piano", "guitar", "other"],  # ML 6-stem only
    "choir":               ["vocals", "drums", "bass", "other"],                     # + Level-2 voice parts
}


@dataclass
class SeparationResult:
    stems: dict[str, np.ndarray] = field(default_factory=dict)   # name -> (ch, n) float32
    sample_rate: int = 44100
    model_name: str = ""
    model_version: str = ""
    engine: str = ""
    warnings: list[str] = field(default_factory=list)


class SeparationModel:
    name = "base"; version = "0"; sources: list[str] = []
    def available(self) -> tuple[bool, str]:
        return False, "not implemented"
    def separate(self, audio: np.ndarray, sr: int, requested: list[str], quality: str,
                 progress=lambda f, m: None) -> SeparationResult:
        raise NotImplementedError


# ---------------------------------------------------------------- DSP engine
class DSPEngine(SeparationModel):
    name = "dsp-softmask"; version = "1.0.0"
    sources = ["vocals", "drums", "bass", "other", "instrumental"]

    def available(self):
        return True, "Classical DSP soft-mask engine (no ML weights required)."

    def _chunk_masks(self, chunk: np.ndarray, sr: int, cfg: dict):
        """Return dict of time-domain stem chunks for one (ch,n) chunk."""
        n_fft, hop, med, power = cfg["n_fft"], cfg["hop"], cfg["med"], cfg["power"]
        stereo = chunk.shape[0] >= 2
        Zs = []
        for ch in range(chunk.shape[0]):
            f, t, Z = dsp.stft(chunk[ch], sr, n_fft, hop)
            Zs.append(Z)
        mags = [np.abs(Z) for Z in Zs]
        mix_mag = np.mean(mags, axis=0) + 1e-10

        # Harmonic / percussive decomposition via median filtering (Fitzgerald 2010).
        harm = median_filter(mix_mag, size=(1, med), mode="nearest")
        perc = median_filter(mix_mag, size=(med, 1), mode="nearest")
        hp_total = harm**2 + perc**2 + 1e-12
        harmonicity = harm**2 / hp_total
        percussiveness = perc**2 / hp_total

        if stereo:
            side = np.abs(Zs[0] - Zs[1]) / (np.abs(Zs[0]) + np.abs(Zs[1]) + 1e-10)
            centreness = np.clip(1.0 - side, 0, 1) ** 1.5
        else:
            centreness = np.full_like(mix_mag, 0.55)   # mono: unknown pan, neutral prior

        freqs = np.fft.rfftfreq(n_fft, 1.0 / sr).astype(np.float32)
        vocal_band = dsp.raised_cosine_band(freqs, 90, 7500, 60, 2500)[:, None]
        low_band = dsp.raised_cosine_band(freqs, 20, 150, 10, 110)[:, None]

        vocal_score = centreness * harmonicity * vocal_band * mix_mag
        drum_score = percussiveness * (1.0 - 0.6 * vocal_band * centreness) * mix_mag
        bass_score = low_band * harmonicity * mix_mag
        other_score = (0.35 + 0.65 * (1 - centreness)) * harmonicity * (1 - low_band) * mix_mag + 0.05 * mix_mag

        masks = dsp.soft_mask_partition([vocal_score, drum_score, bass_score, other_score], power=power)
        names = ["vocals", "drums", "bass", "other"]
        out = {}
        for name, mask in zip(names, masks):
            chans = [dsp.istft(Z * mask, sr, n_fft, hop, length=chunk.shape[1]) for Z in Zs]
            out[name] = np.stack(chans)
        return out

    def separate(self, audio, sr, requested, quality, progress=lambda f, m: None):
        cfg = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["balanced"])
        n = audio.shape[1]
        chunk_s, margin_s = 20.0, 1.0
        chunk_n, margin_n = int(chunk_s * sr), int(margin_s * sr)
        stems = {k: np.zeros_like(audio) for k in ("vocals", "drums", "bass", "other")}
        pos = 0; idx = 0
        total = max(1, int(np.ceil(n / chunk_n)))
        while pos < n:
            lo = max(0, pos - margin_n); hi = min(n, pos + chunk_n + margin_n)
            part = self._chunk_masks(audio[:, lo:hi], sr, cfg)
            a, b = pos - lo, pos - lo + min(chunk_n, n - pos)
            for k in stems:
                stems[k][:, pos:pos + (b - a)] = part[k][:, a:b]
            pos += chunk_n; idx += 1
            progress(idx / total, f"DSP separation chunk {idx}/{total}")
        # Exact reconstruction guarantee (§18/25): residual into `other`, in time domain.
        residual = audio - (stems["vocals"] + stems["drums"] + stems["bass"] + stems["other"])
        stems["other"] = stems["other"] + residual
        result = SeparationResult(sample_rate=sr, model_name=self.name, model_version=self.version,
                                  engine="dsp")
        keep = [s for s in requested if s in ("vocals", "drums", "bass", "other")]
        for k in keep:
            result.stems[k] = stems[k]
        if any(s in requested for s in ("piano", "guitar")):
            result.warnings.append(
                "Piano/guitar stems require the 6-stem ML model (htdemucs_6s), which is not "
                "available on this server — those instruments remain in 'other'. No stems were fabricated.")
        if audio.shape[0] < 2:
            result.warnings.append(
                "Input is mono: vocal extraction cannot use stereo centre information, "
                "so vocal/instrumental bleed will be higher than with stereo material.")
        result.warnings.append(
            "Separated with the classical DSP soft-mask engine. Stems sum exactly to the "
            "original, but source isolation is weaker than a trained model such as Demucs.")
        return result


# ---------------------------------------------------------------- Demucs
class DemucsAdapter(SeparationModel):
    name = "htdemucs"; version = "v4"
    sources = ["vocals", "drums", "bass", "other", "instrumental"]

    def available(self):
        if importlib.util.find_spec("demucs") is None:
            return False, ("demucs is not installed (pip install -r requirements-ml.txt).")
        if importlib.util.find_spec("torch") is None:
            return False, "PyTorch is not installed."
        return True, "Demucs installed (weights download on first use)."

    def separate(self, audio, sr, requested, quality, progress=lambda f, m: None):
        ok, why = self.available()
        if not ok:
            raise RuntimeError(why)
        model = "htdemucs_6s" if any(s in requested for s in ("piano", "guitar")) else DEMUCS_MODEL
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            src = audio_io.save_audio(tmp / "mix.wav", audio, sr)
            cmd = [sys.executable, "-m", "demucs", "-n", model, "--out", str(tmp / "out"),
                   "-d", "cpu", str(src)]
            if set(requested) <= {"vocals", "instrumental"}:
                cmd += ["--two-stems", "vocals"]
            progress(0.1, f"Running Demucs ({model}) — first run downloads weights…")
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
            if proc.returncode != 0:
                raise RuntimeError(f"Demucs failed: {proc.stderr.strip()[-500:]}")
            outdir = tmp / "out" / model / "mix"
            result = SeparationResult(sample_rate=sr, model_name=model, model_version="v4", engine="demucs")
            for f in sorted(outdir.glob("*.wav")):
                name = f.stem.lower()
                if name == "no_vocals":
                    name = "instrumental"
                wav, _ = audio_io.load_audio(f, target_sr=sr)
                # enforce exact sample alignment with input (§98)
                if wav.shape[1] != audio.shape[1]:
                    wav = wav[:, :audio.shape[1]] if wav.shape[1] > audio.shape[1] else \
                        np.pad(wav, ((0, 0), (0, audio.shape[1] - wav.shape[1])))
                result.stems[name] = wav.astype(np.float32)
            progress(1.0, "Demucs complete")
            return result


class UnavailableAdapter(SeparationModel):
    def __init__(self, name, pkg, sources, note):
        self.name, self.pkg, self.sources, self.note = name, pkg, sources, note
        self.version = "n/a"
    def available(self):
        if importlib.util.find_spec(self.pkg) is None:
            return False, self.note
        return False, f"{self.name} package present but no validated weights configured — refusing to fabricate output."
    def separate(self, *a, **k):
        raise RuntimeError(self.available()[1])


REGISTRY: dict[str, SeparationModel] = {
    "dsp-softmask": DSPEngine(),
    "htdemucs": DemucsAdapter(),
    "spleeter": UnavailableAdapter("spleeter", "spleeter", ["vocals", "drums", "bass", "piano", "other"],
                                   "Spleeter is not installed (legacy TensorFlow stack; see docs/ML_NOTES.md)."),
    "mdx": UnavailableAdapter("mdx-net", "mdx", ["vocals", "instrumental"],
                              "No MDX-Net weights are bundled; register validated weights to enable."),
    "roformer": UnavailableAdapter("bs-roformer", "bs_roformer", ["vocals", "instrumental"],
                                   "No BS-RoFormer weights are bundled; register validated weights to enable."),
}


def select_engine(preference: str, requested: list[str]) -> tuple[SeparationModel, list[str]]:
    """Fail-safe model selection (§120) — returns (engine, warnings)."""
    warnings: list[str] = []
    if preference == "dsp":
        return REGISTRY["dsp-softmask"], warnings
    demucs = REGISTRY["htdemucs"]
    ok, why = demucs.available()
    if preference == "demucs":
        if not ok:
            raise RuntimeError(f"Demucs was requested but is unavailable: {why}")
        return demucs, warnings
    # auto
    if ok:
        return demucs, warnings
    warnings.append(f"ML separation unavailable ({why}) Using the DSP soft-mask engine instead.")
    return REGISTRY["dsp-softmask"], warnings
