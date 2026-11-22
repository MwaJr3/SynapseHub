"""Benchmark per-part stems against PawChorale isolated parts (set BENCH_DIR to a folder holding pawc/ex/PawChorale-1.0.0/songs). Dataset is not redistributed; see its RIGHTS_NOTICE."""
"""PawChorale benchmark: score per-part stems from the app's pipeline against the isolated parts."""
import os, sys, json, numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app import vocal, audio_io
import os; S = os.environ.get("BENCH_DIR", ".")
BASE = f"{S}/pawc/ex/PawChorale-1.0.0/songs"
PARTS = ["Soprano", "Alto", "Tenor", "Bass"]
MAP = {"soprano": "Soprano", "mezzo_soprano": "Soprano", "alto": "Alto", "tenor": "Tenor", "baritone": "Bass", "bass": "Bass"}

def load(sid, n=None):
    m, sr = audio_io.load_audio(f"{BASE}/{sid}/{sid}_master.mp3", target_sr=44100)
    t = {p: audio_io.to_mono(audio_io.load_audio(f"{BASE}/{sid}/{sid}_{p}.mp3", target_sr=44100)[0]) for p in PARTS}
    L = min(m.shape[1], *(len(v) for v in t.values()))
    return m[:, :L], {k: v[:L].astype(np.float64) for k, v in t.items()}, sr

def score(est, truth, key):
    L = min(len(est), len(next(iter(truth.values()))))
    V = np.stack([truth[k][:L] for k in truth], 1); e = est[:L].astype(np.float64)
    c, *_ = np.linalg.lstsq(V, e, rcond=None); parts = V * c; ti = list(truth).index(key)
    tgt = (parts[:, ti] ** 2).sum(); intf = sum((parts[:, j] ** 2).sum() for j in range(len(truth)) if j != ti)
    res = ((e - parts.sum(1)) ** 2).sum(); db = lambda a, b: 10 * np.log10((a + 1e-12) / (b + 1e-12))
    return dict(sir=db(tgt, intf), snr=db(tgt, res), sdr=db(tgt, intf + res))

def run_parts(stereo, sr, all_parts=True):
    mono = audio_io.to_mono(stereo)
    an = vocal.analyze_vocals(mono, sr, all_parts=all_parts)
    st = vocal.reconstruct_voice_stems(stereo, sr, an)
    g = vocal.group_part_audio(an["voices"], st)
    return an, g

def report(name, an, groups, truth):
    out = {}
    for part, g in groups.items():
        key = MAP[part]; s = score(audio_io.to_mono(g["audio"]), truth, key)
        out.setdefault(key, []).append((part, s))
    found = sorted({v["assigned_part"] for v in an["voices"] if v["assigned_part"] and v["present"]})
    line = f"{name}: parts found {found} | "
    for key in PARTS:
        if key in out: line += f"{key[:3]} " + "/".join(f"{p[:3]}:{s['sdr']:.1f}" for p, s in out[key]) + "  "
        else: line += f"{key[:3]} MISSING  "
    print(line, flush=True)
    return out

if __name__ == "__main__":
    for sid in sys.argv[1:]:
        m, truth, sr = load(sid)
        an, g = run_parts(m, sr)
        print("song", sid, f"{m.shape[1]/sr:.0f}s", "true parts: 4")
        report("V0 baseline", an, g, truth)
