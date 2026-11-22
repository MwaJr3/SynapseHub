"""BS-RoFormer vocal separation engine (see RoformerAdapter)."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import numpy as np

from .config import ROFORMER_CKPT, ROFORMER_CONFIG, ROFORMER_DEVICE, ROFORMER_PRECISION
from .engine_base import SeparationModel, SeparationResult


def _cpu_has_bf16() -> bool:
    """True when /proc/cpuinfo advertises hardware bf16 (AVX512-BF16 or AMX). Linux only; False elsewhere."""
    try:
        flags = Path("/proc/cpuinfo").read_text()
    except OSError:
        return False
    return "avx512_bf16" in flags or "amx_bf16" in flags


class RoformerRunner:
    """BS-RoFormer vocal separation (MIT code from lucidrains/BS-RoFormer; weights are the user's).

    The model only separates vocals. Drums/bass/other are split from the *remainder*
    (mix - vocals) by the DSP engine, so the stems still sum exactly to the input.
    Requires ``bs-roformer>=0.4,<0.5`` (later releases changed the layer layout and
    cannot load checkpoints trained before that change) plus a checkpoint and its YAML config.
    """
    # Fraction of a chunk shared with its neighbour, per quality preset. 0.5 is the usual reference
    # setting; lower is proportionally faster (compute ~ 1 / (1 - overlap)) and may leave faint seams.
    OVERLAP_FRACTION = {"fast": 0.125, "balanced": 0.25, "high": 0.5, "maximum": 0.75}
    SILENCE_RMS = 1e-4          # chunks quieter than this are not sent to the model

    label = "BS-RoFormer"

    def __init__(self):
        self._model = None
        self._cfg: dict | None = None

    def _paths(self) -> tuple[str, str]:
        """(checkpoint, config) paths; subclasses say where their files are."""
        raise NotImplementedError

    # -- configuration -------------------------------------------------
    @staticmethod
    def _read_config(path: Path) -> dict:
        import yaml

        class _Loader(yaml.SafeLoader):
            pass
        # ZFTurbo-style configs tag tuples; read them without enabling arbitrary python tags.
        _Loader.add_constructor("tag:yaml.org,2002:python/tuple",
                                lambda l, n: tuple(l.construct_sequence(n)))
        cfg = yaml.load(path.read_text(), Loader=_Loader)
        if not isinstance(cfg, dict) or "model" not in cfg or "audio" not in cfg:
            raise ValueError("config must contain 'audio' and 'model' sections")
        if int(cfg["model"].get("linear_transformer_depth", 0)) != 0:
            raise ValueError("configs with linear_transformer_depth > 0 are not supported")
        if int(cfg["model"].get("num_stems", 1)) != 1:
            raise ValueError("only single-stem (vocal) BS-RoFormer configs are supported")
        return cfg

    def available(self):
        ckpt_s, conf_s = self._paths()
        if not ckpt_s or not conf_s:
            return False, f"{self.label} is not configured (checkpoint and config paths are empty)."
        for pkg in ("torch", "bs_roformer", "yaml"):
            if importlib.util.find_spec(pkg) is None:
                return False, f"BS-RoFormer needs the '{pkg}' package (pip install 'bs-roformer>=0.4,<0.5')."
        ckpt, conf = Path(ckpt_s), Path(conf_s)
        if not ckpt.is_file() or not conf.is_file():
            return False, f"{self.label} checkpoint or config file was not found."
        try:
            self._read_config(conf)
        except Exception as e:                       # noqa: BLE001 - report, never crash a health check
            return False, f"{self.label} config is not usable: {e}"
        return True, f"{self.label} checkpoint and config found."

    # -- model ---------------------------------------------------------
    def _device(self):
        import torch
        if ROFORMER_DEVICE in ("cpu", "cuda"):
            return torch.device(ROFORMER_DEVICE)
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def _load(self):
        if self._model is not None:
            return self._model, self._cfg
        import inspect, torch
        import bs_roformer
        ckpt_s, conf_s = self._paths()
        cfg = self._read_config(Path(conf_s))
        # Mel-Band configs carry num_bands; band-split configs carry freqs_per_bands.
        arch = bs_roformer.MelBandRoformer if "num_bands" in cfg["model"] else bs_roformer.BSRoformer
        accepted = inspect.signature(arch.__init__).parameters
        kwargs = {k: v for k, v in cfg["model"].items() if k in accepted}
        # weights_only: a checkpoint is data, never code. A file that needs pickle is refused.
        state = torch.load(ckpt_s, map_location="cpu", weights_only=True)
        if isinstance(state, dict) and "state_dict" in state:
            state = state["state_dict"]
        model = arch(**kwargs)
        model.load_state_dict(state, strict=True)     # layout mismatch fails loudly, not silently
        self._model, self._cfg = model.eval().to(self._device()), cfg
        return self._model, self._cfg

    def _precision(self):
        """(autocast device type, dtype) or None for plain fp32. bf16 is only used where the CPU has
        hardware support: measured 2x faster than fp32 with a 58 dB match on a 2-core Xeon (AMX/AVX512-bf16)."""
        import torch
        dev = self._device()
        want = ROFORMER_PRECISION
        if want == "fp32":
            return None
        if want in ("fp16", "bf16"):
            return dev.type, (torch.float16 if want == "fp16" else torch.bfloat16)
        if dev.type == "cuda":
            return "cuda", torch.float16
        return ("cpu", torch.bfloat16) if _cpu_has_bf16() else None

    @staticmethod
    def plan_chunks(n: int, chunk: int, overlap_fraction: float) -> list[int]:
        """Start offsets covering ``n`` samples. The last chunk is moved back so it is always full
        length (no zero padding fed to the model) and every sample is covered at least once."""
        if n <= chunk:
            return [0]
        step = max(1, int(chunk * (1.0 - overlap_fraction)))
        starts = list(range(0, n - chunk, step))
        starts.append(n - chunk)
        return sorted(set(starts))

    def run_model(self, audio: np.ndarray, sr: int, quality: str, progress) -> np.ndarray:
        import contextlib, torch
        from scipy.signal import resample_poly
        from math import gcd
        model, cfg = self._load()
        msr = int(cfg["audio"].get("sample_rate", 44100))
        mono_in = audio.shape[0] < 2
        x = np.repeat(audio, 2, axis=0) if mono_in else audio[:2]
        x = x.astype(np.float32)
        if sr != msr:
            g = gcd(sr, msr)
            x = resample_poly(x, msr // g, sr // g, axis=1).astype(np.float32)
        n = x.shape[1]
        chunk = int(cfg["audio"]["chunk_size"])
        if n < chunk:                                   # shorter than one chunk: pad once, crop after
            x = np.pad(x, ((0, 0), (0, chunk - n)))
        total = x.shape[1]
        starts = self.plan_chunks(total, chunk, self.OVERLAP_FRACTION.get(quality, 0.5))
        fade = (np.sin(np.linspace(0, np.pi, chunk, endpoint=False) + 1e-3) ** 2).astype(np.float32)
        out = np.zeros_like(x); norm = np.zeros(total, dtype=np.float32)
        dev, prec = self._device(), self._precision()
        ctx = (lambda: torch.autocast(prec[0], dtype=prec[1])) if prec else contextlib.nullcontext
        with torch.inference_mode():
            for i, a in enumerate(starts):
                seg = x[:, a:a + chunk]
                w = np.ones(chunk, np.float32) if (a == 0 and a + chunk >= total) else fade.copy()
                if a == 0:
                    w[: chunk // 2] = 1.0               # the first chunk owns the true start of the file
                if a + chunk >= total:
                    w[chunk // 2:] = 1.0                # ... and the last chunk owns the end
                if float(np.sqrt(np.mean(seg ** 2))) >= self.SILENCE_RMS:
                    with ctx():
                        y = model(torch.from_numpy(seg).unsqueeze(0).to(dev))
                    y = y.squeeze(0).float().cpu().numpy()
                else:
                    y = np.zeros_like(seg)              # silence in, silence out: no model call
                out[:, a:a + chunk] += y * w
                norm[a:a + chunk] += w
                progress(0.1 + 0.8 * (i + 1) / len(starts), f"{self.label} chunk {i + 1}/{len(starts)}")
        out /= np.maximum(norm, 1e-6)
        out = out[:, :n]
        if sr != msr:
            g = gcd(sr, msr)
            out = resample_poly(out, sr // g, msr // g, axis=1).astype(np.float32)
        out = out[:, :audio.shape[1]]
        if out.shape[1] < audio.shape[1]:
            out = np.pad(out, ((0, 0), (0, audio.shape[1] - out.shape[1])))
        return out[:1] if mono_in else out

    _vocals = run_model            # historical name


class RoformerAdapter(RoformerRunner, SeparationModel):
    name = "bs-roformer"; version = "viperx-ep317"
    sources = ["vocals", "instrumental", "drums", "bass", "other"]

    def __init__(self, instrument_splitter=None):
        super().__init__()
        self._splitter = instrument_splitter        # injected: splits mix-vocals into drums/bass/other

    def _paths(self):
        return ROFORMER_CKPT, ROFORMER_CONFIG

    def instrument_splitter(self):
        if self._splitter is None:
            raise RuntimeError("RoformerAdapter needs an instrument splitter for drums/bass/other")
        return self._splitter

    def separate(self, audio, sr, requested, quality, progress=lambda f, m: None):
        ok, why = self.available()
        if not ok:
            raise RuntimeError(why)
        vocals = self._vocals(audio, sr, quality, progress)
        rest = (audio - vocals).astype(np.float32)
        result = SeparationResult(sample_rate=sr, model_name=self.name, model_version=self.version,
                                  engine="bs-roformer")
        result.stems["vocals"] = vocals
        if "instrumental" in requested:
            result.stems["instrumental"] = rest
        if any(s in requested for s in ("drums", "bass", "other")):
            progress(0.92, "Splitting the instrumental into drums / bass / other (DSP)…")
            dsp_res = self.instrument_splitter().separate(rest, sr, ["vocals", "drums", "bass", "other"], quality)
            others = dsp_res.stems["other"] + dsp_res.stems["vocals"]    # stray vocal energy stays out of vocals
            parts = {"drums": dsp_res.stems["drums"], "bass": dsp_res.stems["bass"], "other": others}
            parts["other"] = parts["other"] + (rest - sum(parts.values()))    # exact sum with the mix
            for k in ("drums", "bass", "other"):
                if k in requested:
                    result.stems[k] = parts[k].astype(np.float32)
        result.warnings.append(
            "Vocals were separated with BS-RoFormer. Drums, bass and other were split from the remaining "
            "instrumental by the DSP engine, so they are weaker than a full multi-stem model.")
        progress(1.0, "BS-RoFormer complete")
        return result


class StemStage(RoformerRunner):
    """One optional post-processing model applied to a stem (karaoke lead/backing, de-reverb).

    Same loader and chunked inference as the separation engine; it only differs in which files it reads.
    """
    def __init__(self, label: str, ckpt: str, config: str):
        super().__init__()
        self.label, self._ckpt, self._conf = label, ckpt, config

    def _paths(self):
        return self._ckpt, self._conf
