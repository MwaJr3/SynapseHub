"""Audio load/save. Primary codec: libsndfile via soundfile (WAV/FLAC/MP3/OGG/AIFF...).
M4A/AAC are only decodable when an ffmpeg binary is present — otherwise we fail
with an explicit, human-readable error instead of pretending support.
All internal processing is float32 WAV; lossy encoding happens only at export (§19/26).
"""
from __future__ import annotations
import shutil, subprocess, tempfile
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from .config import FFMPEG

TARGET_SR = 44100


class AudioDecodeError(RuntimeError):
    pass


def ffmpeg_available() -> bool:
    return shutil.which(FFMPEG) is not None


def probe(path: str | Path) -> dict:
    """Metadata without decoding the whole file."""
    try:
        info = sf.info(str(path))
        return {
            "format": info.format, "subtype": info.subtype, "sample_rate": info.samplerate,
            "channels": info.channels, "frames": info.frames,
            "duration": round(info.frames / info.samplerate, 3) if info.samplerate else 0.0,
            "codec": info.format,
        }
    except Exception:
        if ffmpeg_available():
            return {"format": "ffmpeg", "codec": "unknown", "duration": 0.0,
                    "sample_rate": 0, "channels": 0, "frames": 0, "subtype": ""}
        raise AudioDecodeError(
            "This file could not be decoded. WAV, FLAC, MP3, OGG and AIFF are supported "
            "natively; M4A/AAC require ffmpeg, which is not installed on this server.")


def _decode_via_ffmpeg(path: Path) -> tuple[np.ndarray, int]:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        out = tmp.name
    try:
        subprocess.run([FFMPEG, "-v", "error", "-y", "-i", str(path), "-ac", "2",
                        "-ar", str(TARGET_SR), out], check=True, capture_output=True, timeout=600)
        data, sr = sf.read(out, always_2d=True, dtype="float32")
        return data.T.copy(), sr
    except Exception as e:
        raise AudioDecodeError(f"ffmpeg could not decode this file: {e}")
    finally:
        Path(out).unlink(missing_ok=True)


def load_audio(path: str | Path, target_sr: int = TARGET_SR) -> tuple[np.ndarray, int]:
    """Returns (channels, samples) float32, resampled to target_sr, ≥1 channel kept stereo-aware."""
    p = Path(path)
    try:
        data, sr = sf.read(str(p), always_2d=True, dtype="float32")
        audio = data.T.copy()                      # (ch, n)
    except Exception:
        if ffmpeg_available():
            audio, sr = _decode_via_ffmpeg(p)
        else:
            raise AudioDecodeError(
                "Unsupported or corrupt audio. Natively supported: WAV, FLAC, MP3, OGG, AIFF. "
                "M4A/AAC need ffmpeg on the server.")
    if audio.shape[1] == 0:
        raise AudioDecodeError("The file contains no audio samples.")
    if sr != target_sr:
        from math import gcd
        g = gcd(sr, target_sr)
        audio = np.stack([resample_poly(ch, target_sr // g, sr // g) for ch in audio]).astype(np.float32)
    return np.clip(audio, -1.0, 1.0).astype(np.float32), target_sr


def save_audio(path: str | Path, audio: np.ndarray, sr: int, fmt: str = "WAV",
               subtype: str | None = None) -> Path:
    """audio: (channels, samples). WAV default PCM_24 (lossless working/export format)."""
    p = Path(path); p.parent.mkdir(parents=True, exist_ok=True)
    data = np.clip(np.asarray(audio, dtype=np.float32), -1.0, 1.0).T
    fmt = fmt.upper()
    if fmt == "MP3":
        subtype = subtype or "MPEG_LAYER_III"
    elif fmt == "WAV":
        subtype = subtype or "PCM_24"
    elif fmt == "FLAC":
        subtype = subtype or "PCM_24"
    sf.write(str(p), data, sr, format=fmt, subtype=subtype)
    return p


def to_mono(audio: np.ndarray) -> np.ndarray:
    return audio.mean(axis=0).astype(np.float32) if audio.shape[0] > 1 else audio[0].copy()


def duration_of(audio: np.ndarray, sr: int) -> float:
    return audio.shape[-1] / sr
