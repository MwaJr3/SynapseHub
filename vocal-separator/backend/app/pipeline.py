"""Asynchronous processing pipeline (§6/10) + job state machine (§49).

Stages emit status/progress/warnings to the DB (surfaced via SSE, §48).
Partial results are first-class (§72): a failed/uncertain voice-part stage
never discards good Level-1 stems. Final quality gate (§121) verifies files,
alignment and metadata before a job may become COMPLETED.
"""
from __future__ import annotations
import json, time, zipfile
from pathlib import Path
import numpy as np

from . import PIPELINE_VERSION, audio_io, dsp, engines, outcomes, presence, quality, vocal
from .db import SessionLocal, ProcessingJob, ProcessingStage, Stem, VoiceTrack, AudioFile, Export, now
from .storage import storage

STAGES = ["validating", "preprocessing", "separating", "vocal_analysis",
          "voice_part_separation", "quality_check", "exporting"]


def _stage(job_id, name, state, progress=0.0, message="", duration=0.0):
    with SessionLocal() as s:
        row = s.query(ProcessingStage).filter_by(job_id=job_id, name=name).first()
        if row is None:
            row = ProcessingStage(job_id=job_id, name=name); s.add(row)
        row.state, row.progress, row.message, row.duration_s = state, progress, message, duration
        job = s.get(ProcessingJob, job_id)
        if job:
            done = s.query(ProcessingStage).filter_by(job_id=job_id).filter(
                ProcessingStage.state.in_(["done", "skipped"])).count()
            job.progress = round(min(0.99, (done + progress) / len(STAGES)), 3) if state == "running" else job.progress
            job.message = message or name
        s.commit()


def _set_job(job_id, **kw):
    with SessionLocal() as s:
        job = s.get(ProcessingJob, job_id)
        for k, v in kw.items():
            setattr(job, k, v)
        s.commit()


def _waveform_peaks(mono: np.ndarray, buckets: int = 600) -> list[float]:
    if mono.size == 0:
        return []
    idx = np.array_split(np.abs(mono), min(buckets, mono.size))
    return [round(float(np.max(x)) if x.size else 0.0, 4) for x in idx]


def run_job(job_id: int) -> None:
    t_start = time.time()
    with SessionLocal() as s:
        job = s.get(ProcessingJob, job_id)
        if job is None or job.state == "CANCELLED":
            return
        cfg = dict(job.config or {})
        audio_file = s.get(AudioFile, job.audio_file_id)
        src_key, src_meta, filename = audio_file.storage_key, dict(audio_file.meta or {}), audio_file.filename
    quality_preset = cfg.get("quality", "balanced")
    profile = cfg.get("profile", "choir")
    engine_pref = cfg.get("engine", "auto")
    want_voice_parts = bool(cfg.get("vocal_analysis", True))
    all_parts = bool(cfg.get("all_voice_parts", False))
    wanted = {p for p in (cfg.get("voice_parts") or []) if p in vocal.PART_ORDER}
    lead_ids: set[str] = set()
    base = Path(filename).stem[:60] or "song"
    warnings: list[str] = []
    report: dict = {"input": {"filename": filename, **src_meta},
                    "pipeline": PIPELINE_VERSION, "detected_sources": [], "voice_analysis": {}}
    stems_dir = f"stems/job-{job_id}"
    try:
        _set_job(job_id, state="PREPROCESSING", started_at=now(), pipeline_version=PIPELINE_VERSION)

        # ---- preprocessing: decode, resample (lossless working format, §19)
        t = time.time(); _stage(job_id, "validating", "running", 0.5, "Validated upload on ingest")
        _stage(job_id, "validating", "done", 1, "Format, signature, duration validated", 0)
        _stage(job_id, "preprocessing", "running", 0.2, "Decoding & resampling to 44.1 kHz working format…")
        mix, sr = audio_io.load_audio(storage.path(src_key))
        if mix.shape[0] == 1:
            mix = np.repeat(mix, 2, axis=0)          # dual-mono keeps channel layout predictable
            warnings.append("Mono input duplicated to dual-mono for processing; separation confidence reduced.")
        peak = float(np.max(np.abs(mix))) or 1.0
        if peak > 0.999:
            mix = mix * (0.999 / peak)
            warnings.append("Input was clipped at full scale; normalised by a small gain before processing.")
        _stage(job_id, "preprocessing", "done", 1, f"{mix.shape[1]/sr:.1f}s @ {sr} Hz, {mix.shape[0]}ch",
               time.time() - t)

        # ---- Level 1 separation
        t = time.time(); _set_job(job_id, state="SEPARATING")
        requested = engines.PROFILES.get(profile, engines.PROFILES["full"])
        engine, sel_w = engines.select_engine(engine_pref, requested)
        warnings += sel_w
        _stage(job_id, "separating", "running", 0.05, f"Separating with {engine.name}…")
        try:
            result = engine.separate(mix, sr, requested, quality_preset,
                                     progress=lambda f, m: _stage(job_id, "separating", "running", f, m))
        except Exception as e:    # fail-safe fallback, user-visible (§120)
            if engine.name == "dsp-softmask":
                raise
            warnings.append(f"{engine.name} failed ({e}). A compatible fallback model (DSP soft-mask) was used.")
            engine = engines.REGISTRY["dsp-softmask"]
            result = engine.separate(mix, sr, requested, quality_preset,
                                     progress=lambda f, m: _stage(job_id, "separating", "running", f, m))
        warnings += result.warnings
        _set_job(job_id, model_name=result.model_name, model_version=result.model_version)
        report["separation"] = {"model": result.model_name, "version": result.model_version,
                                "engine": result.engine, "quality": quality_preset, "profile": profile}
        stems_np: dict[str, np.ndarray] = dict(result.stems)
        if "instrumental" in requested and "instrumental" not in stems_np and "vocals" in stems_np:
            stems_np["instrumental"] = mix - stems_np["vocals"]     # exact complement
        if profile == "vocals_instrumental" and "vocals" in stems_np and "instrumental" not in stems_np:
            stems_np["instrumental"] = mix - stems_np["vocals"]
        _stage(job_id, "separating", "done", 1, f"Produced {len(stems_np)} music stems", time.time() - t)

        level1_names = set(stems_np)              # music stems; voice parts must never reuse these names
        part_meta: dict[str, dict] = {}
        voice_stem_ids: dict[str, str] = {}       # stem name -> voice_id for every reconstructed part
        outcome_code = outcomes.DISABLED
        lead_code = outcomes.LEAD_NOT_APPLICABLE
        skip_note = "Disabled in job options"

        # ---- what is actually in the recording? (vocals / instruments / a cappella)
        dropped_stems: list[str] = []
        if "vocals" in stems_np:
            instr = presence.analyse_instrumentation(mix, stems_np, sr, reliable=result.engine != "dsp")
            report["instrumentation"] = instr
            dropped_stems = presence.absent_stems(instr)
            if instr["kind"] != "vocals_with_instruments" or instr["confidence"] == "low":
                warnings.append(instr["note"])
            if instr["kind"] == "instrumental_only":
                want_voice_parts = False
                outcome_code = outcomes.NO_VOCALS_IN_SONG
                skip_note = "No vocals found in this recording"

        # ---- Level 2 vocal analysis + voice-part separation
        analysis = None
        if want_voice_parts and "vocals" in stems_np:
            t = time.time(); _set_job(job_id, state="ANALYZING")
            _stage(job_id, "vocal_analysis", "running", 0.1, "Tracking vocal pitch lines…")
            vocal_mono = audio_io.to_mono(stems_np["vocals"])
            # vocal presence gate: near-silent vocal stem => no fabricated voices
            if dsp.rms(vocal_mono) < 1e-4:
                warnings.append("The extracted vocal stem is near-silent; no voices were analysed. "
                                "This recording may be instrumental, or vocals may not be centre-panned.")
                _stage(job_id, "vocal_analysis", "done", 1, "No analysable vocal energy", time.time() - t)
                _stage(job_id, "voice_part_separation", "skipped", 1, "Skipped — no vocal evidence")
                outcome_code = outcomes.NO_VOCAL_ENERGY
            else:
                analysis = vocal.analyze_vocals(
                    vocal_mono, sr, all_parts=all_parts or bool(wanted),
                    progress=lambda f, m: _stage(job_id, "vocal_analysis", "running", f, m))
                _stage(job_id, "vocal_analysis", "done", 1,
                       f"{analysis['estimated_voice_count']} voice line(s), up to "
                       f"{analysis['max_simultaneous_voices']} simultaneous", time.time() - t)
                for v in analysis["voices"]:
                    with SessionLocal() as s:
                        s.add(VoiceTrack(job_id=job_id, voice_id=v["voice_id"], role=v["role"],
                                         classification=v["classification"], confidence=v["confidence"],
                                         data={k: val for k, val in v.items() if k != "_line"}))
                        s.commit()
                report["voice_analysis"] = {
                    "estimated_voice_count": analysis["estimated_voice_count"],
                    "max_simultaneous_voices": analysis["max_simultaneous_voices"],
                    "pitch_backend": analysis["pitch_backend"],
                    "parts": [{k: val for k, val in v.items() if k != "_line"} for v in analysis["voices"]],
                }
                present_parts = [p for p in vocal.PART_ORDER
                                 if any(v.get("assigned_part") == p and v.get("present") for v in analysis["voices"])]
                report["voice_analysis"]["parts_present"] = present_parts
                report["voice_analysis"]["parts_absent"] = [p for p in vocal.PART_ORDER if p not in present_parts]
                t = time.time()
                avail = [v for v in analysis["voices"] if v["stem_available"]]
                if avail:
                    _stage(job_id, "voice_part_separation", "running", 0.1,
                           f"Reconstructing {len(avail)} voice part(s) via harmonic masks…")
                    voice_stems = vocal.reconstruct_voice_stems(
                        stems_np["vocals"], sr, analysis,
                        progress=lambda f, m: _stage(job_id, "voice_part_separation", "running", f, m))
                    lead = next((v for v in avail if v.get("is_lead") and v["voice_id"] in voice_stems), None)
                    if lead is not None:
                        # Exact complement, like the instrumental: lead + backing == vocals.
                        stems_np["backing_vocals"] = stems_np["vocals"] - voice_stems[lead["voice_id"]]
                        lead_code = outcomes.LEAD_READY
                    # One merged stem per *present* part; names never reuse Level-1 names.
                    groups = vocal.group_part_audio(analysis["voices"], voice_stems)
                    if wanted:
                        groups = {p: g for p, g in groups.items() if p in wanted}
                    reserved = set(stems_np)
                    for part, g in groups.items():
                        name = part if part not in reserved else f"{part}_voice"
                        stems_np[name] = g["audio"]
                        voice_stem_ids[name] = g["primary"]
                        part_meta[name] = {"voice_ids": g["voice_ids"], "best_guess": g["best_guess"], "part": part}
                    if lead is not None:
                        stems_np["lead_vocal"] = voice_stems[lead["voice_id"]]
                        lead_ids.add("lead_vocal")
                        voice_stem_ids["lead_vocal"] = lead["voice_id"]
                    report["voice_analysis"]["part_stems"] = {
                        n: {"part": m["part"], "voice_ids": m["voice_ids"], "best_guess": m["best_guess"]}
                        for n, m in part_meta.items()}
                    outcome_code = (outcomes.ALL_PARTS_READY if all_parts else outcomes.READY) if part_meta else (
                        outcomes.NO_WANTED_PART if wanted else outcomes.NO_PART_STEMS)
                    _stage(job_id, "voice_part_separation", "done", 1,
                           f"{len(voice_stems)} experimental voice-part stem(s)", time.time() - t)
                else:
                    warnings.append("Vocal lines were detected but none met the confidence/evidence "
                                    "threshold for an exported voice-part stem. We report the analysis "
                                    "instead of fabricating parts.")
                    _stage(job_id, "voice_part_separation", "done", 1,
                           "No voice part met the export threshold — see analysis", time.time() - t)
                    outcome_code = outcomes.NO_PART_MET_THRESHOLD
        else:
            _stage(job_id, "vocal_analysis", "skipped", 1, skip_note)
            _stage(job_id, "voice_part_separation", "skipped", 1, skip_note)

        # ---- quality assessment + save stems (+previews, waveform peaks)
        t = time.time(); _set_job(job_id, state="QUALITY_CHECK")
        _stage(job_id, "quality_check", "running", 0.3, "Measuring bleed, levels and alignment…")
        core = [k for k in ("vocals", "drums", "bass", "other") if k in level1_names]
        report["reconstruction"] = quality.reconstruction_residual(mix, {k: stems_np[k] for k in core}, core) \
            if len(core) == 4 else {"note": "subset profile — residual check n/a"}
        for name in dropped_stems:                      # not in the song: do not export leakage as a stem
            stems_np.pop(name, None)
        report["omitted_stems"] = dropped_stems
        report["voice_outcome"] = outcomes.describe(outcome_code)
        report["lead_split_outcome"] = outcomes.describe(lead_code)
        saved = []
        for name, wav in stems_np.items():
            q = quality.assess_stem(name, wav, stems_np, mix)
            q["waveform"] = _waveform_peaks(audio_io.to_mono(wav))
            if name in part_meta:
                q["voice_ids"] = part_meta[name]["voice_ids"]
                q["best_guess"] = part_meta[name]["best_guess"]
            key = f"{stems_dir}/{base}_{name}.wav"
            audio_io.save_audio(storage.path(key), wav, sr)
            preview_key = f"{stems_dir}/{base}_{name}.preview.mp3"
            try:
                audio_io.save_audio(storage.path(preview_key), wav, sr, fmt="MP3")
            except Exception:
                preview_key = key
            kind = "derived" if name in lead_ids else \
                   "voice_part" if name in part_meta else \
                   "derived" if name in ("instrumental", "backing_vocals") else "music"
            saved.append((name, kind, key, preview_key, voice_stem_ids.get(name, ""), q))
            report["detected_sources"].append(name)
        # original as a first-class stem (§20/27)
        orig_key = f"{stems_dir}/{base}_original.wav"
        audio_io.save_audio(storage.path(orig_key), mix, sr)
        oq = quality.assess_stem("original", mix, {}, mix)
        oq["waveform"] = _waveform_peaks(audio_io.to_mono(mix))
        saved.insert(0, ("original", "original", orig_key, orig_key, "", oq))
        with SessionLocal() as s:
            for name, kind, key, preview_key, vid, q in saved:
                s.add(Stem(job_id=job_id, name=name, kind=kind, storage_key=key,
                           preview_key=preview_key, voice_id=vid or "", quality=q))
            s.commit()
        _stage(job_id, "quality_check", "done", 1, "Quality metrics recorded", time.time() - t)

        # ---- export artefacts: analysis JSONs + report (§40/41)
        t = time.time(); _set_job(job_id, state="EXPORTING")
        _stage(job_id, "exporting", "running", 0.4, "Writing analysis + processing report…")
        adir = f"analysis/job-{job_id}"
        if analysis:
            storage.put_bytes(f"{adir}/pitch-data.json",
                              json.dumps(analysis["pitch_tracks"]).encode())
            storage.put_bytes(f"{adir}/voice-parts.json",
                              json.dumps(report["voice_analysis"], indent=2).encode())
        report["warnings"] = warnings
        report["processing_time"] = round(time.time() - t_start, 2)
        storage.put_bytes(f"{adir}/processing-report.json", json.dumps(report, indent=2).encode())
        _stage(job_id, "exporting", "done", 1, "Downloads ready", time.time() - t)

        # ---- final quality gate (§121)
        ok = all(storage.path(k).exists() for _, _, k, _, _, _ in saved) and \
            report.get("reconstruction", {}).get("sample_aligned", True)
        if not ok:
            raise RuntimeError("Final quality gate failed: missing/misaligned stem files.")
        _set_job(job_id, state="COMPLETED", progress=1.0, finished_at=now(),
                 warnings=warnings, report=report, message="Separation complete")
    except Exception as e:
        _set_job(job_id, state="FAILED", finished_at=now(), warnings=warnings,
                 error=str(e), message="Processing failed")
        raise


def make_zip_export(job_id: int, fmt: str = "WAV") -> str:
    """Batch ZIP (§39/40): only stems that actually exist + metadata/analysis."""
    with SessionLocal() as s:
        job = s.get(ProcessingJob, job_id)
        stems = s.query(Stem).filter_by(job_id=job_id).all()
        report = dict(job.report or {})
        rows = [(st.name, st.storage_key) for st in stems]
    key = f"exports/job-{job_id}/stems-{fmt.lower()}.zip"
    zpath = storage.path(key); zpath.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for name, skey in rows:
            p = storage.path(skey)
            if fmt.upper() == "WAV" or not p.exists():
                z.write(p, f"audio/{p.name}")
            else:
                wav, sr = audio_io.load_audio(p)
                tmp = zpath.parent / f"{name}.{fmt.lower()}"
                audio_io.save_audio(tmp, wav, sr, fmt=fmt.upper())
                z.write(tmp, f"audio/{tmp.name}"); tmp.unlink(missing_ok=True)
        z.writestr("metadata/processing-report.json", json.dumps(report, indent=2))
        adir = storage.path(f"analysis/job-{job_id}")
        if adir.exists():
            for f in sorted(adir.glob("*.json")):
                z.write(f, f"analysis/{f.name}")
    with SessionLocal() as s:
        s.add(Export(job_id=job_id, format=fmt.upper(), storage_key=key)); s.commit()
    return key
