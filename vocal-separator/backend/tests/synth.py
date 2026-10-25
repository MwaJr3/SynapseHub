"""Synthetic SATB + accompaniment with known ground truth (§90 golden dataset —
synthetic edition). Lets us measure real behaviour instead of asserting it.
Conditions are favourable to the DSP engine (centre-panned voices, off-centre
accompaniment) and the tests/README say so; nothing here claims commercial-
recording performance."""
import numpy as np

SR = 44100

def _voice_note(midi, dur, sr, brightness=0.6, vibrato_hz=5.2):
    n = int(dur * sr); t = np.arange(n) / sr
    f0 = 440 * 2 ** ((midi - 69) / 12)
    vib = 1 + 0.004 * np.sin(2 * np.pi * vibrato_hz * t)
    phase = 2 * np.pi * f0 * np.cumsum(vib) / sr
    y = np.zeros(n)
    for h in range(1, 13):
        y += (brightness ** (h - 1) / h) * np.sin(h * phase + 0.3 * h)
    env = np.minimum(1, np.minimum(t / 0.06, np.maximum(0, (dur - t) / 0.09)))
    return (0.5 * y * env).astype(np.float32)

def _render_line(notes, sr, brightness):
    parts, spans = [], []
    t = 0.0
    for midi, dur in notes:
        parts.append(_voice_note(midi, dur, sr, brightness)); spans.append((t, t + dur, midi)); t += dur
    return np.concatenate(parts), spans

# C – Am – F – G, 2 s per chord. Medians ≈ S72 A65 T60 B45 (well-separated tessituras).
LINES = {
    "soprano": ([(72, 1), (76, 1), (74, 1), (72, 1), (69, 1), (72, 1), (74, 1), (71, 1)], 0.75),
    "alto":    ([(67, 1), (64, 1), (65, 1), (67, 1), (64, 1), (65, 1), (62, 1), (64, 1)], 0.65),
    "tenor":   ([(60, 1), (60, 1), (57, 1), (60, 1), (57, 1), (57, 1), (59, 1), (62, 1)], 0.6),
    "bass":    ([(48, 1), (43, 1), (45, 1), (43, 1), (41, 1), (45, 1), (43, 1), (48, 1)], 0.5),
}

def make_satb_mix(sr=SR, with_accompaniment=True):
    voices, spans = {}, {}
    for name, (notes, bright) in LINES.items():
        voices[name], spans[name] = _render_line(notes, sr, bright)
    n = max(len(v) for v in voices.values())
    vocal_mix = np.sum([np.pad(v, (0, n - len(v))) for v in voices.values()], axis=0) * 0.5
    t = np.arange(n) / sr
    if with_accompaniment:
        bass = np.zeros(n); roots = [36, 33, 29, 31]
        for i, r in enumerate(roots * 2):
            seg = slice(i * sr, (i + 1) * sr)
            f = 440 * 2 ** ((r - 69) / 12)
            bass[seg] = 0.35 * np.sin(2 * np.pi * f * t[seg]) + 0.12 * np.sin(4 * np.pi * f * t[seg])
        rng = np.random.default_rng(7)
        drums = np.zeros(n)
        for beat in range(0, n, sr // 2):                      # hats
            drums[beat:beat + 1200] += rng.normal(0, 0.25, 1200) * np.exp(-np.arange(1200) / 300)
        for beat in range(0, n, sr):                           # kicks
            k = np.arange(4000); drums[beat:beat + 4000] += 0.5 * np.sin(2 * np.pi * (120 - 60 * k / 4000) * k / sr) * np.exp(-k / 1200)
        piano = np.zeros(n); chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
        for c in range(8):
            for m in chords[c % 4]:
                f = 440 * 2 ** ((m - 69) / 12); seg = slice(c * sr, (c + 1) * sr)
                tt = np.arange(sr) / sr
                piano[seg] += 0.10 * np.sin(2 * np.pi * f * tt) * np.exp(-tt * 2.5)
        # stereo image: voices centre, bass centre-low, piano right, drums wide noise
        left = vocal_mix + bass * 0.9 + piano * 0.5 + drums
        right = vocal_mix + bass * 0.9 + piano * 1.1 + drums * 0.8
        mix = np.stack([left, right]).astype(np.float32)
        acc = np.stack([bass * 0.9 + piano * 0.5 + drums, bass * 0.9 + piano * 1.1 + drums * 0.8]).astype(np.float32)
    else:
        mix = np.stack([vocal_mix, vocal_mix]).astype(np.float32); acc = None
    mix /= max(1.0, np.max(np.abs(mix)) / 0.9)
    return {"mix": mix, "voices": voices, "spans": spans,
            "vocal_mix": np.stack([vocal_mix, vocal_mix]).astype(np.float32),
            "accompaniment": acc, "sr": sr}
