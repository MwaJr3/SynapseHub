import os, sys, numpy as np, librosa
sys.path.insert(0, os.path.dirname(__file__))
import pawchorale_bench as B
from app import vocal, audio_io, dsp
FMIN = {"Soprano": "C4", "Alto": "F3", "Tenor": "C3", "Bass": "C2"}; FMAX = {"Soprano": "C6", "Alto": "C5", "Tenor": "G4", "Bass": "E4"}
def oracle_lines(truth, sr):
    lines = {}
    for k, y in truth.items():
        y22 = librosa.resample(y.astype(np.float32), orig_sr=sr, target_sr=22050)
        f0, vf, _ = librosa.pyin(y22, fmin=librosa.note_to_hz(FMIN[k]), fmax=librosa.note_to_hz(FMAX[k]), sr=22050, frame_length=2048, hop_length=441)
        t = np.arange(len(f0)) * 441 / 22050; ok = vf & ~np.isnan(f0)
        lines[k] = vocal.VoiceLine(list(t[ok]), list(librosa.hz_to_midi(f0[ok])), [1.0] * int(ok.sum()))
    return lines
def run(sid):
    m, truth, sr = B.load(sid)
    lines = oracle_lines(truth, sr)
    an = {"voices": [{"voice_id": f"v_{k}", "voiced_seconds": 99.0, "stem_available": True, "_line": ln} for k, ln in lines.items()]}
    st = vocal.reconstruct_voice_stems(m, sr, an)
    out = []
    for k in B.PARTS:
        s = B.score(audio_io.to_mono(st[f"v_{k}"]), truth, k); out.append(f"{k[:3]} SIR {s['sir']:.1f} SDR {s['sdr']:.1f}")
    print("oracle", sid, " | ".join(out), flush=True)
for sid in sys.argv[1:]: run(sid)
