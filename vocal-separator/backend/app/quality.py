"""StemQualityEngine (§68/69): measurable, reference-free quality indicators.
We report proxies we can actually compute (energy, silence, clipping,
inter-stem correlation as a bleed proxy, reconstruction residual) — never
invented SDR numbers without ground truth.
"""
from __future__ import annotations
import numpy as np
from . import dsp


def assess_stem(name: str, stem: np.ndarray, others: dict[str, np.ndarray], mix: np.ndarray) -> dict:
    mono = stem.mean(axis=0) if stem.ndim == 2 else stem
    mix_mono = mix.mean(axis=0) if mix.ndim == 2 else mix
    if mono.size == 0:
        return {"stem": name, "quality": "empty", "warnings": ["Stem contains no samples."]}
    frame = 2048
    frames = [mono[i:i+frame] for i in range(0, max(len(mono)-frame, 1), frame)]
    silent = float(np.mean([dsp.rms(f) < 1e-4 for f in frames])) if frames else 1.0
    clipped = float(np.mean(np.abs(mono) >= 0.999))
    # Bleed proxy: max normalised correlation with any other stem (0 = isolated, 1 = duplicate).
    bleed = 0.0
    down = mono[::16]
    dn = np.linalg.norm(down) + 1e-12
    for oname, o in others.items():
        if oname == name: continue
        om = (o.mean(axis=0) if o.ndim == 2 else o)[::16]
        bleed = max(bleed, float(abs(np.dot(down, om)) / (dn * (np.linalg.norm(om) + 1e-12))))
    warns = []
    if silent > 0.9: warns.append("Stem is mostly silent — this source may be absent from the recording.")
    if clipped > 0.001: warns.append("Clipping detected in this stem.")
    if bleed > 0.75: warns.append("High correlation with another stem — significant source bleed is likely.")
    elif bleed > 0.45: warns.append("Moderate bleed from other sources is likely audible.")
    energy_share = float(np.sum(mono**2) / (np.sum(mix_mono**2) + 1e-20))
    quality = "good" if (bleed < 0.45 and clipped <= 0.001 and silent <= 0.9) else \
              "fair" if bleed < 0.75 else "poor"
    return {
        "stem": name, "quality": quality,
        "rms_dbfs": round(dsp.dbfs(mono), 2),
        "peak": round(float(np.max(np.abs(mono))), 4),
        "silence_ratio": round(silent, 3),
        "clipped_ratio": round(clipped, 5),
        "bleed_proxy": round(bleed, 3),
        "energy_share": round(energy_share, 4),
        "warnings": warns,
    }


def reconstruction_residual(mix: np.ndarray, stems: dict[str, np.ndarray], include: list[str]) -> dict:
    total = sum(stems[k] for k in include if k in stems)
    if not isinstance(total, np.ndarray):
        return {"residual_db_below_mix": None}
    resid = mix - total
    return {"residual_db_below_mix": round(dsp.dbfs(mix) - dsp.dbfs(resid), 2),
            "sample_aligned": bool(all(stems[k].shape == mix.shape for k in include if k in stems))}
