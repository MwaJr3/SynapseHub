"""Practice mixes: the song with one part taken out ("minus-one").

A singer or player who wants to supply one part themselves needs everything
*except* that part, at a usable level. The mix is the original recording minus the
chosen stem, so it works for every stem the job holds: a Level-1 stem (take out the
drums), the lead vocal, or a reconstructed voice part. Because stems are made as
sample-aligned pieces of the same mix, subtraction leaves the rest of the song.

If the subtraction would pass full scale (a stem that was cancelling something else),
the whole mix is scaled down to just under full scale instead of being clipped.
"""
from __future__ import annotations
import numpy as np

CEILING = 0.999


def minus_one_mix(mix: np.ndarray, target: np.ndarray, ceiling: float = CEILING) -> tuple[np.ndarray, float]:
    """``(mix - target)`` as float32 plus the gain that was applied (1.0 when none was needed)."""
    if mix.shape != target.shape:
        raise ValueError(f"mix {mix.shape} and stem {target.shape} are not sample-aligned")
    out = mix.astype(np.float32) - target.astype(np.float32)
    peak = float(np.max(np.abs(out))) if out.size else 0.0
    gain = ceiling / peak if peak > ceiling else 1.0
    return (out * gain).astype(np.float32), float(gain)
