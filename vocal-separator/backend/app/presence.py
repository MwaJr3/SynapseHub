"""Which sources does this recording actually contain?

Separation models always return every stem they were asked for, even when the source is not in
the song (an a cappella choir still gets a "drums" stem made of leakage). Exporting those stems
as if they were real is misleading, so this module decides from measured energy whether vocals and
instruments are present, and says how much to trust that decision.
"""
from __future__ import annotations
import numpy as np

A_CAPPELLA_REST_SHARE = 0.03     # everything that is not vocals is < 3 % of the mix energy (-15 dB)
NO_VOCALS_SHARE = 0.02           # vocals are < 2 % of the mix energy: instrumental recording
STEM_PRESENT_SHARE = 0.01        # a stem needs >= 1 % of the mix energy ...
STEM_PRESENT_ACTIVE = 0.10       # ... and to be audible in >= 10 % of the frames
ACTIVE_FLOOR_DB = -40.0          # "audible": within 40 dB of the stem's own loud passages
FRAME_S = 0.05

KINDS = ("a_cappella", "vocals_with_instruments", "instrumental_only")


def _energy(x: np.ndarray) -> float:
    return float(np.sum(np.asarray(x, dtype=np.float64) ** 2))


def _active_fraction(x: np.ndarray, sr: int) -> float:
    """Share of 50 ms frames within ACTIVE_FLOOR_DB of the stem's 95th-percentile frame level."""
    mono = x.mean(axis=0) if x.ndim == 2 else x
    fr = max(1, int(sr * FRAME_S)); m = len(mono) // fr * fr
    if m == 0:
        return 0.0
    rms = np.sqrt((mono[:m].reshape(-1, fr) ** 2).mean(axis=1))
    ref = float(np.percentile(rms, 95))
    if ref <= 1e-9:
        return 0.0
    return float(np.mean(rms > ref * 10 ** (ACTIVE_FLOOR_DB / 20)))


def analyse_instrumentation(mix: np.ndarray, stems: dict[str, np.ndarray], sr: int, reliable: bool) -> dict:
    """Decide ``kind`` and which Level-1 stems are really present.

    ``stems`` must contain ``vocals``. ``reliable`` is True when the vocal stem came from a trained
    model: with the classical DSP engine, vocal energy leaks into drums/other so an a cappella
    recording looks like it has instruments. The decision is still returned but flagged low-confidence.
    """
    total = max(_energy(mix), 1e-12)
    vocals = stems["vocals"]
    vocal_share = _energy(vocals) / total
    rest_share = _energy(mix - vocals) / total
    per = {}
    for name, x in stems.items():
        share = _energy(x) / total
        active = _active_fraction(x, sr)
        per[name] = {"energy_share": round(share, 4), "active_fraction": round(active, 3),
                     "present": bool(share >= STEM_PRESENT_SHARE and active >= STEM_PRESENT_ACTIVE)}
    per["vocals"]["present"] = bool(vocal_share >= NO_VOCALS_SHARE and per["vocals"]["active_fraction"] >= STEM_PRESENT_ACTIVE)
    if not per["vocals"]["present"]:
        kind = "instrumental_only"
    elif rest_share < A_CAPPELLA_REST_SHARE:
        kind = "a_cappella"
    else:
        kind = "vocals_with_instruments"
    if kind == "a_cappella":
        for name in per:
            if name != "vocals":
                per[name]["present"] = False
    note = {
        "a_cappella": "No meaningful instrumental content was found: this sounds like voices only, so drums, bass and other were not exported.",
        "instrumental_only": "No meaningful vocal content was found, so no voice analysis was done.",
        "vocals_with_instruments": "Vocals and instrumental content were both found.",
    }[kind]
    if not reliable:
        note += (" The built-in DSP separator leaks between sources, so treat this as a rough estimate; "
                 "a trained model (BS-RoFormer or Demucs) gives a dependable answer.")
    return {"kind": kind, "confidence": "high" if reliable else "low",
            "vocal_energy_share": round(vocal_share, 4), "non_vocal_energy_share": round(rest_share, 4),
            "stems": per, "note": note}


def absent_stems(report: dict, candidates=("drums", "bass", "other")) -> list[str]:
    """Level-1 stems that should not be exported. Only trusted (model-based) decisions remove a stem."""
    if report["confidence"] != "high":
        return []
    return [n for n in candidates if n in report["stems"] and not report["stems"][n]["present"]]
