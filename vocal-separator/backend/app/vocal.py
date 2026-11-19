"""Level-2 vocal intelligence (§9–17, §20–24).

Pipeline: multi-pitch salience on the vocal stem -> frame-level candidate F0s ->
continuity linking into voice lines -> fragment merging (persistent voices) ->
probabilistic voice-part classification -> harmonic soft-mask reconstruction
of per-voice stems, confidence-gated (§20/71/73: never fabricate a part).

Pitch backends: torchcrepe (CREPE) when installed+weights reachable, else a
built-in harmonic-salience multi-pitch estimator (works polyphonically,
unlike single-F0 autocorrelation trackers, which we use only to refine).
Everything here is evidence-based: thresholds are explicit, `Unknown` is a
first-class result, and every number shown to users comes from these metrics.
"""
from __future__ import annotations
import importlib.util
from dataclasses import dataclass, field
import numpy as np
from . import dsp

ANALYSIS_SR = 22050
MIDI_MIN, MIDI_MAX = 36, 86            # C2 .. D6 candidate grid (0.5-semitone steps)
MIN_VOICE_SECONDS = 1.2                # evidence required before a part stem may exist
MIN_STEM_CONFIDENCE = 0.40             # below this: detected but "separation unavailable" (§73)

# The six standard vocal ranges (reference chart "The Standard 6 Vocal Ranges").
# These are the *published* extremes of each voice type, as MIDI note numbers
# (C4 = 60). They bound what a part may plausibly sing; they are not tessituras.
VOCAL_RANGE_CHART = {
    "soprano":       dict(lo=60, hi=84),   # C4 - C6
    "mezzo_soprano": dict(lo=57, hi=81),   # A3 - A5
    "alto":          dict(lo=53, hi=77),   # F3 - F5   (the chart's "Alto (Contralto)")
    "tenor":         dict(lo=48, hi=72),   # C3 - C5
    "baritone":      dict(lo=43, hi=67),   # G2 - G4
    "bass":          dict(lo=40, hi=64),   # E2 - E4
}

# Older results (and user corrections) used a seven-class scheme. The chart has
# one Alto (Contralto) range and no Bass-baritone, so the old labels map onto it.
LEGACY_PART_ALIASES = {"contralto": "alto", "bass_baritone": "baritone"}


def canonical_part(label: str | None) -> str:
    """Current class name for ``label`` (legacy names are mapped; unknown stays unknown)."""
    if not label:
        return "unknown"
    return LEGACY_PART_ALIASES.get(label, label)


# Musicological priors (§10): tessitura centre/width on top of the chart range.
# "centroid" = expected spectral centroid of the voice's own harmonic series, in
# semitones relative to its median pitch. This is deliberately WEAK evidence
# (0.85–1.00 multiplier): formant/tract cues help at the margins but cannot turn
# an ambiguous alto/tenor line into a certain one — that stays Unknown (§71).
# Tessitura centres sit in the comfortable lower-middle of each chart range.
VOICE_PARTS = {
    "soprano":       dict(centre=69.0, width=4.5, centroid=26.0, **VOCAL_RANGE_CHART["soprano"]),
    "mezzo_soprano": dict(centre=66.0, width=3.4, centroid=25.5, **VOCAL_RANGE_CHART["mezzo_soprano"]),
    "alto":          dict(centre=61.5, width=4.2, centroid=24.8, **VOCAL_RANGE_CHART["alto"]),
    "tenor":         dict(centre=60.0, width=4.0, centroid=24.0, **VOCAL_RANGE_CHART["tenor"]),
    "baritone":      dict(centre=54.5, width=3.8, centroid=23.0, **VOCAL_RANGE_CHART["baritone"]),
    "bass":          dict(centre=49.5, width=3.6, centroid=22.0, **VOCAL_RANGE_CHART["bass"]),
}

MIN_LEAD_SECONDS = 4.0                 # a dominant line this long may be exported as the lead vocal


def chart_range_notes(part: str) -> tuple[str, str]:
    r = VOCAL_RANGE_CHART[canonical_part(part)]
    return dsp.midi_to_note(float(r["lo"])), dsp.midi_to_note(float(r["hi"]))


def chart_fit(midis) -> list[dict]:
    """Share of a line's pitches that fall inside each chart range, best first.

    Several ranges usually contain a line (the chart's ranges overlap by design),
    so this is evidence about *which parts could sing it*, not a classification.
    """
    m = np.asarray(midis, dtype=float)
    out = []
    for part, r in VOCAL_RANGE_CHART.items():
        lo_n, hi_n = chart_range_notes(part)
        out.append({"class": part, "lowest_note": lo_n, "highest_note": hi_n,
                    "within_range_ratio": round(float(np.mean((m >= r["lo"]) & (m <= r["hi"]))), 3) if m.size else 0.0})
    return sorted(out, key=lambda d: -d["within_range_ratio"])


def assign_voice_stem_names(voices: list[dict], reserved: set[str]) -> dict[str, str]:
    """voice_id -> unique stem name for every exported voice.

    ``reserved`` holds names already taken by Level-1 stems. A reconstructed
    "bass" voice must never replace the real bass stem, so a clash becomes
    ``bass_voice`` (or ``<name>_<voice_id>`` if that is taken too). The lead line
    is always named ``lead_vocal``; unclassified lines use their voice id.
    """
    used = set(reserved)
    names: dict[str, str] = {}
    for v in voices:
        if not v.get("stem_available"):
            continue
        cls = v.get("classification", "unknown")
        base = "lead_vocal" if v.get("is_lead") else (cls if cls != "unknown" else v["voice_id"])
        name = base
        if name in used:
            name = f"{base}_voice" if base in reserved else f"{base}_{v['voice_id']}"
        if name in used:
            name = f"{base}_{v['voice_id']}"
        used.add(name)
        names[v["voice_id"]] = name
    return names


def confidence_label(c: float) -> str:
    if c >= 0.90: return "High confidence"
    if c >= 0.75: return "Good confidence"
    if c >= 0.60: return "Moderate confidence"
    if c >= 0.40: return "Low confidence"
    return "Unreliable"


# ------------------------------------------------------------------ pitch
def _pitch_grid(mag_bins: int, sr: int):
    midis = np.arange(MIDI_MIN, MIDI_MAX + 0.01, 0.5)
    f0s = dsp.midi_to_freq(midis)
    bin_hz = sr / (2 * (mag_bins - 1))
    idx = np.round(np.outer(f0s, np.arange(1, 7)) / bin_hz).astype(int)   # (G, 6)
    weights = (1.0 / np.arange(1, 7)).astype(np.float32)
    return midis, f0s, idx, weights, bin_hz


def harmonic_salience(mag: np.ndarray, freqs: np.ndarray, sr: int) -> tuple[np.ndarray, np.ndarray]:
    """Fundamental-adjusted harmonic salience over a 0.5-semitone MIDI grid.

    The weighted harmonic sum is scaled by the prominence of the candidate's
    own fundamental. This retains real voices whose fundamentals happen to be
    harmonics of a lower voice (common in SATB chords), while strongly
    suppressing subharmonic ghosts: they can borrow energy at 2f, 3f, ... but
    have little or no energy at f itself.
    """
    midis, _, idx, weights, _ = _pitch_grid(mag.shape[0], sr)
    valid = idx < mag.shape[0]
    gathered = np.where(valid[:, :, None], mag[np.clip(idx, 0, mag.shape[0] - 1)], 0)
    sal = (gathered * weights[None, :, None]).sum(axis=1)
    fundamental = gathered[:, 0, :]
    strongest_partial = gathered.max(axis=1) + 1e-12
    sal *= 0.30 + 0.70 * np.clip(fundamental / strongest_partial * 1.6, 0, 1)
    # Suppress subharmonic ghosts: candidate m is penalised by a strong candidate
    # one octave ABOVE it (m+12 = 24 grid steps) — the ghost's harmonics coincide
    # with the true note's. (Direction matters; verified against synthetic SATB.)
    above = np.zeros_like(sal); above[:-24] = sal[24:]
    sal = sal - 0.3 * np.minimum(sal, above)
    return midis, np.maximum(sal, 0)


def _is_exact_harmonic_relation(midi_a: float, midi_b: float) -> bool:
    """Whether the higher pitch is (near-)exactly a harmonic of the lower one.

    The candidate grid is quantized to 0.5 semitones, while perfect harmonic
    intervals are 12, 19.02, 24, 27.86, ... semitones. A ±0.35-semitone
    tolerance therefore captures harmonics 2-6 without treating ordinary
    chord intervals as exact harmonic relationships.
    """
    interval = abs(float(midi_a) - float(midi_b))
    return any(abs(interval - 12.0 * np.log2(h)) <= 0.35 for h in range(2, 7))


def multipitch_frames(mag: np.ndarray, sr: int, max_voices: int = 6,
                      stop_ratio: float = 0.30, min_gap_semi: float = 1.5,
                      harmonic_stop_ratio: float = 0.50):
    """Select simultaneous pitches from salience peaks on the original spectrum.

    An earlier version cancelled every harmonic bin of each accepted pitch
    before searching for the next one. That is unsafe in tonal SATB writing:
    in a C-major chord, for example, the tenor, alto and soprano fundamentals
    can coincide with harmonics 2, 3 and 4 of the bass. Cancelling the bass
    therefore deleted evidence for three real singers. Ground-truth synthetic
    diagnostics confirmed that all four true pitches are strong on the
    *original* fundamental-adjusted salience, while the cancellation version
    detected the soprano in only 37.5% of steady-state frames.

    This selector instead accepts separated local salience maxima from the
    original spectrum. A candidate in an exact harmonic relation to an
    already accepted pitch must clear a higher evidence threshold relative
    to that accepted pitch. This rejects typical weak octave/fifth ghosts
    without imposing a blanket ban on real chord voices whose fundamentals
    overlap another singer's harmonic series.
    """
    if mag.ndim != 2 or mag.shape[1] == 0:
        return []

    freqs = np.fft.rfftfreq(2 * (mag.shape[0] - 1), d=1.0 / sr)
    midis, sal_all = harmonic_salience(mag, freqs, sr)
    energy = mag.sum(axis=0)
    e_med = float(np.median(energy)) + 1e-12
    frames: list[list[tuple[float, float]]] = []

    for t in range(mag.shape[1]):
        if energy[t] < 0.08 * e_med:                     # voice-activity gate
            frames.append([])
            continue

        col = sal_all[:, t]
        if col.size == 0 or float(np.max(col)) <= 0:
            frames.append([])
            continue

        # A peak must dominate a ±1-semitone neighbourhood, not merely its
        # immediate ±0.5-semitone grid neighbours. The wider window suppresses
        # low-prominence shoulders beside a strong low pitch (observed as a
        # false 41.5 line beside a true 43 bass), while still allowing two
        # genuine voices a whole tone apart to be selected independently.
        padded = np.pad(col, (2, 2), constant_values=-np.inf)
        window_max = np.max(
            np.stack([padded[i:i + len(col)] for i in range(5)]), axis=0)
        peaks = np.flatnonzero((col >= window_max) & (col > 0))
        if peaks.size == 0:
            frames.append([])
            continue

        ordered_peaks = peaks[np.argsort(-col[peaks], kind="stable")]
        first_sal = float(col[ordered_peaks[0]])
        accepted: list[int] = []

        for peak in ordered_peaks:
            g = int(peak)
            relative = float(col[g] / max(first_sal, 1e-12))
            if relative < stop_ratio:
                break
            if any(abs(float(midis[g]) - float(midis[a])) < min_gap_semi
                   for a in accepted):
                continue

            harmonic_related = [
                a for a in accepted
                if _is_exact_harmonic_relation(float(midis[g]), float(midis[a]))
            ]
            if harmonic_related:
                strongest_related = max(float(col[a]) for a in harmonic_related)
                if float(col[g]) < harmonic_stop_ratio * strongest_related:
                    continue

            accepted.append(g)
            if len(accepted) >= max_voices:
                break

        chosen = [
            (float(midis[g]), float(min(col[g] / max(first_sal, 1e-12), 1.0)))
            for g in sorted(accepted, key=lambda idx: float(midis[idx]))
        ]
        frames.append(chosen)

    return frames


# ------------------------------------------------------------------ tracking
@dataclass
class VoiceLine:
    times: list[float] = field(default_factory=list)
    midis: list[float] = field(default_factory=list)
    strengths: list[float] = field(default_factory=list)

    @property
    def duration(self): return (max(self.times) - min(self.times)) if len(self.times) > 1 else 0.0
    @property
    def median_midi(self): return float(np.median(self.midis)) if self.midis else 0.0


def link_tracks(cands, times, max_jump=3.0, max_gap_frames=14):
    """Greedy continuity linking (§19): prefer smallest pitch distance, allow short gaps."""
    active: list[VoiceLine] = []; done: list[VoiceLine] = []
    last_seen: dict[int, int] = {}
    for ti, frame in enumerate(cands):
        used = set(); matched_lines = set()
        pairs = []
        for li, line in enumerate(active):
            if not line.midis: continue
            for ci, (m, s) in enumerate(frame):
                d = abs(m - line.midis[-1])
                if d <= max_jump: pairs.append((d, li, ci))
        pairs.sort()
        for d, li, ci in pairs:
            if li in matched_lines or ci in used: continue
            active[li].times.append(float(times[ti])); active[li].midis.append(frame[ci][0])
            active[li].strengths.append(frame[ci][1]); last_seen[id(active[li])] = ti
            matched_lines.add(li); used.add(ci)
        for ci, (m, s) in enumerate(frame):
            if ci not in used:
                line = VoiceLine([float(times[ti])], [m], [s]); active.append(line)
                last_seen[id(line)] = ti
        still = []
        for line in active:
            if ti - last_seen[id(line)] > max_gap_frames: done.append(line)
            else: still.append(line)
        active = still
    return done + active


def _shared_frame_count(a: list[float], b: list[float], tol: float = 0.004) -> int:
    """Count samples in ``a`` that occupy the same analysis frame as ``b``."""
    if not a or not b:
        return 0
    bb = np.sort(np.array(b))
    shared = 0
    for t in a:
        i = np.searchsorted(bb, t)
        if (i < len(bb) and abs(bb[i] - t) <= tol) or (
                i > 0 and abs(bb[i - 1] - t) <= tol):
            shared += 1
    return shared


def _times_overlap(a: list[float], b: list[float], tol: float = 0.004) -> bool:
    """Whether two fragments overlap materially, rather than at a note boundary.

    A 4096-sample analysis window is ~186 ms long at 22.05 kHz, so consecutive
    notes from one singer can be detected together for a few frames around a
    transition. Treating *any* shared frame as proof of two singers split the
    synthetic bass into one voice per note. We therefore block merging only
    when at least ten frames (~116 ms at the analysis hop) are shared *and*
    those frames are >15% of the shorter fragment. Sustained simultaneous
    voices overlap for far longer than that; ordinary transitions do not.
    Short spurious fragments are removed separately in ``merge_fragments``.
    """
    if not a or not b:
        return False
    shared = _shared_frame_count(a, b, tol=tol)
    return shared >= 10 and shared / min(len(a), len(b)) > 0.15


def merge_fragments(lines: list[VoiceLine], median_tol: float = 9.0) -> list[VoiceLine]:
    """Voice-leading assignment (§19): notes fragment at leaps/rests, so fragments are
    reassembled into persistent voices by two rules — (1) fragments overlapping
    materially in time can never be the same voice; (2) among admissible voices
    prefer the nearest tessitura. Tiny fragments are discarded first: at the
    256-sample analysis hop, 18 frames is ~0.21 s, below which detections are
    usually note-onset/partial artefacts rather than evidence of a singer.
    This is what keeps Voice A from becoming Voice B after every phrase break."""
    frags = [l for l in lines if len(l.times) >= 18]
    frags.sort(key=lambda l: (min(l.times), -l.median_midi))
    voices: list[VoiceLine] = []
    for frag in frags:
        best, best_d = None, 1e9
        for v in voices:
            if _times_overlap(frag.times, v.times):
                continue
            d = abs(frag.median_midi - v.median_midi)
            if d < best_d:
                best, best_d = v, d
        if best is not None and best_d <= median_tol:
            order = np.argsort(np.array(best.times + frag.times))
            best.times = np.array(best.times + frag.times)[order].tolist()
            best.midis = np.array(best.midis + frag.midis)[order].tolist()
            best.strengths = np.array(best.strengths + frag.strengths)[order].tolist()
        else:
            voices.append(frag)
    return sorted(voices, key=lambda l: -l.median_midi)


# ------------------------------------------------------------------ classification
def classify_voice(line: VoiceLine, rel_centroid_st: float | None = None) -> dict:
    """Probabilistic part classification from whole-line behaviour (§16/17) — never one note.

    Pitch distribution is the primary evidence. ``rel_centroid_st`` is the median
    spectral centroid of this voice's own tracked harmonic series, expressed in
    semitones relative to the sung pitch. It is a weak formant/tract-length cue,
    so it can move a score by no more than 15%; ambiguous middle voices remain
    honestly ambiguous instead of being tipped into a false certainty.
    """
    midis = np.array(line.midis)
    median, p10, p90 = float(np.median(midis)), float(np.percentile(midis, 10)), float(np.percentile(midis, 90))
    scores = {}
    for part, prior in VOICE_PARTS.items():
        gauss = np.exp(-0.5 * ((median - prior["centre"]) / prior["width"]) ** 2)
        in_range = float(np.mean((midis >= prior["lo"] - 2) & (midis <= prior["hi"] + 2)))
        # Extremes far outside a part's plausible range argue against it (§17).
        extent = np.exp(-0.5 * (max(0, prior["lo"] - p10) / 6.0) ** 2) * np.exp(-0.5 * (max(0, p90 - prior["hi"]) / 6.0) ** 2)
        timbre = 1.0
        if rel_centroid_st is not None and np.isfinite(rel_centroid_st):
            timbre = 0.85 + 0.15 * float(np.exp(
                -0.5 * ((rel_centroid_st - prior["centroid"]) / 7.0) ** 2))
        scores[part] = float(gauss * (0.35 + 0.65 * in_range) * extent * timbre)
    total = sum(scores.values()) + 1e-12
    probs = sorted(((k, v / total) for k, v in scores.items()), key=lambda kv: -kv[1])
    top, second = probs[0], probs[1]
    margin = top[1] - second[1]
    stability = float(np.clip(1.0 - np.std(midis) / 18.0, 0.3, 1.0))
    confidence = float(np.clip(top[1] * (0.55 + 0.45 * min(margin * 3, 1)) * stability
                               * min(len(midis) / 60.0, 1.0) ** 0.5, 0, 0.98))
    label = top[0] if confidence >= MIN_STEM_CONFIDENCE else "unknown"
    return {
        "classification": label,
        "predicted": top[0],
        "confidence": round(confidence, 3),
        "confidence_label": confidence_label(confidence),
        "predictions": [{"class": k, "probability": round(float(v), 3)} for k, v in probs],
        "range": {"lowest_midi": int(np.min(midis)), "highest_midi": int(np.max(midis)),
                  "lowest_note": dsp.midi_to_note(float(np.min(midis))),
                  "highest_note": dsp.midi_to_note(float(np.max(midis)))},
        "pitch_statistics": {"median_midi": round(median, 2), "mean_midi": round(float(np.mean(midis)), 2),
                             "p10_midi": round(p10, 2), "p90_midi": round(p90, 2)},
        "chart_fit": chart_fit(midis),
    }


# ------------------------------------------------------------------ reconstruction
def harmonic_masks(Z: np.ndarray, freqs: np.ndarray, times: np.ndarray,
                   lines: list[VoiceLine]) -> list[np.ndarray]:
    """Soft-assign each TF bin to the voice whose harmonic series best explains it.
    Bins far from every active harmonic stay unassigned (returned masks exclude them);
    the pipeline sums the remainder into an honest 'other vocal / residual' signal."""
    mag = np.abs(Z)
    scores = [np.full(mag.shape, 1e-4, dtype=np.float32) for _ in lines]  # tiny floor
    frame_map = []
    for line in lines:  # interpolate line pitch onto STFT frame times
        if len(line.times) >= 2:
            m = np.interp(times, line.times, line.midis, left=np.nan, right=np.nan)
            outside = (times < min(line.times) - 0.05) | (times > max(line.times) + 0.05)
            m[outside] = np.nan
        else:
            m = np.full(len(times), np.nan)
        frame_map.append(m)
    for vi, mcurve in enumerate(frame_map):
        for h in range(1, 9):
            target = dsp.midi_to_freq(np.nan_to_num(mcurve, nan=-50)) * h     # (frames,)
            cents = 1200 * np.log2(np.maximum(freqs[:, None], 1) / np.maximum(target[None, :], 1e-6))
            w = np.exp(-0.5 * (cents / 55.0) ** 2) / h ** 0.7
            w[:, np.isnan(mcurve)] = 0
            w[freqs > 9500, :] = 0
            scores[vi] += (w * mag).astype(np.float32)
    masks = dsp.soft_mask_partition(scores, power=1.5)
    # Gate: bins weakly explained by ANY voice are scaled down, not force-assigned.
    explained = np.clip(sum(s for s in scores) / (mag + 1e-10), 0, 1)
    return [m * explained for m in masks]


def _voice_relative_centroid(line: VoiceLine, mag: np.ndarray, freqs: np.ndarray,
                             times: np.ndarray) -> float | None:
    """Median harmonic-series centroid of one tracked voice, relative to its F0.

    Only samples already assigned to this voice are measured. At each sampled
    frame we read the spectrum at the first ten harmonics of that voice's tracked
    pitch, rather than taking a centroid of the entire mixed vocal stem. The
    result is expressed in semitones above the sung pitch and is used only as a
    weak classification cue in :func:`classify_voice`.
    """
    if len(line.times) < 3 or mag.ndim != 2 or mag.shape[1] == 0:
        return None
    bin_hz = float(freqs[1] - freqs[0]) if len(freqs) > 1 else 0.0
    if bin_hz <= 0:
        return None

    sample_idx = np.arange(0, len(line.times), 4)
    frame_idx = np.clip(np.searchsorted(times, np.array(line.times)[sample_idx]),
                        0, mag.shape[1] - 1)
    relative: list[float] = []
    harmonic_numbers = np.arange(1, 11, dtype=np.float32)
    for sample_pos, frame_pos in zip(sample_idx, frame_idx):
        midi = float(line.midis[sample_pos])
        f0 = float(dsp.midi_to_freq(midi))
        harmonic_freqs = f0 * harmonic_numbers
        bins = np.rint(harmonic_freqs / bin_hz).astype(int)
        valid = (bins >= 0) & (bins < mag.shape[0]) & (harmonic_freqs <= 9500)
        if np.count_nonzero(valid) < 3:
            continue
        mags = mag[bins[valid], int(frame_pos)].astype(np.float64)
        total = float(mags.sum())
        if total <= 1e-12:
            continue
        centroid_hz = float(np.dot(harmonic_freqs[valid], mags) / total)
        if centroid_hz > 0:
            relative.append(float(dsp.freq_to_midi(centroid_hz) - midi))
    return float(np.median(relative)) if relative else None


def crepe_available() -> tuple[bool, str]:
    if importlib.util.find_spec("torchcrepe") is None or importlib.util.find_spec("torch") is None:
        return False, "torchcrepe/torch not installed — using built-in multi-pitch salience."
    return True, "torchcrepe present (weights fetched on first use)."


def analyze_vocals(vocal_mono: np.ndarray, sr: int, max_voices: int = 6,
                   progress=lambda f, m: None) -> dict:
    """Full Level-2 analysis on a mono vocal signal. Returns voices + pitch tracks + meta."""
    from scipy.signal import resample_poly
    from math import gcd
    sig = vocal_mono.astype(np.float32)
    if sr != ANALYSIS_SR:
        g = gcd(sr, ANALYSIS_SR)
        sig = resample_poly(sig, ANALYSIS_SR // g, sr // g).astype(np.float32)
    n_fft, hop = 4096, 256                    # 5.4 Hz bins: separates low voices
    freqs, times, Z = dsp.stft(sig, ANALYSIS_SR, n_fft, hop)
    mag = np.abs(Z)
    energy = mag.sum(axis=0)
    progress(0.25, "Estimating multiple pitches (iterative cancellation)…")
    cands = multipitch_frames(mag, ANALYSIS_SR, max_voices=max_voices)
    sim_counts = [len(c) for c in cands]
    max_simultaneous = int(np.percentile(sim_counts, 92)) if sim_counts else 0
    progress(0.55, "Tracking voice lines…")
    lines = merge_fragments(link_tracks(cands, times))
    voices = []
    for i, line in enumerate(lines):
        if len(line.times) * hop / ANALYSIS_SR < 0.5:   # <0.5s of evidence: not a voice
            continue
        rel_centroid_st = _voice_relative_centroid(line, mag, freqs, times)
        cls = classify_voice(line, rel_centroid_st)
        voiced_s = float(len(line.times) * hop / ANALYSIS_SR)
        enough = voiced_s >= MIN_VOICE_SECONDS and cls["confidence"] >= MIN_STEM_CONFIDENCE
        voices.append({
            "voice_id": f"voice_{len(voices)+1:02d}",
            "role": "ensemble" if len(lines) > 1 else "solo",
            **cls,
            "voiced_seconds": round(voiced_s, 2),
            "stem_available": bool(enough),
            "stem_unavailable_reason": None if enough else (
                "Insufficient voiced evidence" if voiced_s < MIN_VOICE_SECONDS else
                "Classification/separation confidence below threshold — reported as Unknown rather than fabricated (§71)."),
            "_line": line,
        })
    # Lead heuristic: most voiced seconds + highest mean strength = probable lead (§14).
    for v in voices:
        v["is_lead"] = False
    if len(voices) > 1:
        lead = max(voices, key=lambda v: v["voiced_seconds"])
        lead["role"] = "possible_lead"
        lead["is_lead"] = True
        # The lead is chosen by dominance, not by part class, so a long lead line is
        # exported as the lead vocal even when its class stays Unknown. The class
        # itself is left as-is: only the stem is allowed, never a made-up label.
        if not lead["stem_available"] and lead["voiced_seconds"] >= MIN_LEAD_SECONDS:
            lead["stem_available"] = True
            lead["stem_unavailable_reason"] = None
            lead["stem_note"] = ("Exported as the lead vocal (longest, most persistent line); "
                                 "its voice part is still reported as Unknown.")
    pitch_tracks = {v["voice_id"]: [
        {"time": round(float(t), 3), "midi": round(float(m), 2),
         "frequency": round(float(dsp.midi_to_freq(m)), 2), "note": dsp.midi_to_note(m),
         "confidence": round(float(s), 3)}
        for t, m, s in zip(v["_line"].times, v["_line"].midis, v["_line"].strengths)]
        for v in voices}
    crepe_ok, crepe_note = crepe_available()
    progress(0.8, "Classifying voice parts…")
    return {
        "voices": voices, "pitch_tracks": pitch_tracks,
        "estimated_voice_count": len(voices),
        "max_simultaneous_voices": max_simultaneous,
        "pitch_backend": "harmonic-salience (built-in)", "pitch_backend_note": crepe_note,
        "vocal_activity_ratio": round(float(np.mean(energy > 0.08 * (np.median(energy) + 1e-12))), 3),
    }


def reconstruct_voice_stems(vocals: np.ndarray, sr: int, analysis: dict,
                            progress=lambda f, m: None) -> dict[str, np.ndarray]:
    """Per-voice stems via harmonic masks on the stereo vocal stem (§13/18).
    Keyed by voice_id; pipeline names files by classified part. Chunked for RAM."""
    lines = [v["_line"] for v in analysis["voices"] if v["stem_available"]]
    ids = [v["voice_id"] for v in analysis["voices"] if v["stem_available"]]
    if not lines:
        return {}
    n = vocals.shape[1]; out = {vid: np.zeros_like(vocals) for vid in ids}
    n_fft, hop = 4096, 1024
    chunk_n, margin_n = int(20 * sr), int(1 * sr)
    pos, step, total = 0, 0, max(1, int(np.ceil(n / chunk_n)))
    while pos < n:
        lo, hi = max(0, pos - margin_n), min(n, pos + chunk_n + margin_n)
        seg = vocals[:, lo:hi]
        t0 = lo / sr
        Zs = [dsp.stft(seg[ch], sr, n_fft, hop)[2] for ch in range(seg.shape[0])]
        freqs, times, _ = dsp.stft(seg[0], sr, n_fft, hop)
        shifted = []
        for line in lines:
            nl = VoiceLine([t - t0 for t in line.times], list(line.midis), list(line.strengths))
            shifted.append(nl)
        mid = Zs[0] if len(Zs) == 1 else (Zs[0] + Zs[1]) / 2
        masks = harmonic_masks(mid, freqs, times, shifted)
        for vid, mask in zip(ids, masks):
            chans = [dsp.istft(Z * mask, sr, n_fft, hop, length=seg.shape[1]) for Z in Zs]
            a, b = pos - lo, pos - lo + min(chunk_n, n - pos)
            out[vid][:, pos:pos + (b - a)] = np.stack(chans)[:, a:b]
        pos += chunk_n; step += 1
        progress(step / total, f"Reconstructing voice-part stems {step}/{total}")
    return out
