"""Shared DSP primitives: STFT, soft masks, music helpers."""
from __future__ import annotations
import numpy as np
from scipy.signal import stft as _stft, istft as _istft

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def freq_to_midi(f: float) -> float:
    return 69.0 + 12.0 * np.log2(max(f, 1e-6) / 440.0)


def midi_to_freq(m: float) -> float:
    return 440.0 * 2.0 ** ((m - 69.0) / 12.0)


def midi_to_note(m: float) -> str:
    r = int(round(m))
    return f"{NOTE_NAMES[r % 12]}{r // 12 - 1}"


def stft(x: np.ndarray, sr: int, n_fft: int = 2048, hop: int = 512):
    f, t, Z = _stft(x, fs=sr, nperseg=n_fft, noverlap=n_fft - hop, window="hann",
                    boundary="zeros", padded=True)
    return f, t, Z.astype(np.complex64)


def istft(Z: np.ndarray, sr: int, n_fft: int = 2048, hop: int = 512, length: int | None = None):
    _, x = _istft(Z, fs=sr, nperseg=n_fft, noverlap=n_fft - hop, window="hann",
                  boundary=True, input_onesided=True)
    x = x.astype(np.float32)
    if length is not None:
        x = x[:length] if len(x) >= length else np.pad(x, (0, length - len(x)))
    return x


def soft_mask_partition(scores: list[np.ndarray], power: float = 1.0) -> list[np.ndarray]:
    """Wiener-style partition: masks sum to 1 at every TF bin => stems sum to the mix."""
    total = np.zeros_like(scores[0])
    powered = []
    for s in scores:
        p = np.power(np.maximum(s, 0), power).astype(np.float32)
        powered.append(p); total += p
    total = np.maximum(total, 1e-12)
    return [p / total for p in powered]


def raised_cosine_band(freqs: np.ndarray, lo: float, hi: float, fade_lo: float, fade_hi: float) -> np.ndarray:
    w = np.ones_like(freqs, dtype=np.float32)
    below = freqs < lo
    w[below] = 0.5 - 0.5 * np.cos(np.pi * np.clip((freqs[below] - (lo - fade_lo)) / max(fade_lo, 1), 0, 1))
    above = freqs > hi
    w[above] = 0.5 + 0.5 * np.cos(np.pi * np.clip((freqs[above] - hi) / max(fade_hi, 1), 0, 1))
    w[freqs < lo - fade_lo] = 0.0
    w[freqs > hi + fade_hi] = 0.0
    return w


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(x)) + 1e-20)) if x.size else 0.0


def dbfs(x: np.ndarray) -> float:
    return 20.0 * np.log10(rms(x) + 1e-12)
