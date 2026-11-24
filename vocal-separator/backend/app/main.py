"""FastAPI application (§82): auth, projects, uploads, jobs (SSE progress),
stems with signed downloads, voice-analysis, exports, admin + model registry.
Every object access is owner-scoped (§84). Uploaded files are never executed (§55).
"""
from __future__ import annotations
import asyncio, hashlib, json, time
from pathlib import Path
from fastapi import (FastAPI, Depends, HTTPException, UploadFile, File, Request,
                     BackgroundTasks)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel as BM
import re

from . import PIPELINE_VERSION, audio_io, engines, practice, quality, vocal
from .config import ADMIN_EMAIL, RETENTION_DAYS, CORS_ORIGINS
from .db import (SessionLocal, init_db, User, Project, AudioFile, ProcessingJob,
                 ProcessingStage, Stem, VoiceTrack, ModelRecord, AuditLog, Export, now)
from .security import hash_password, verify_password, make_token, decode_token, sign_download, verify_download
from .storage import storage
from .validation import validate_upload, UploadValidationError
from .jobs import enqueue
from .pipeline import make_zip_export, _waveform_peaks

app = FastAPI(title="AI Music & Vocal Part Separator", version="0.1.0",
              description="Hierarchical stem + voice-part separation. Extracted stems are "
                          "AI/DSP reconstructions, never original isolated recordings.")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS,
                   allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                   allow_headers=["Authorization", "Content-Type"])

# naive per-IP rate limit for auth/upload (§117); production uses the gateway/Redis counters.
_hits: dict[str, list[float]] = {}
def rate_limit(request: Request, key: str, limit: int = 30, window: int = 60):
    ip = request.client.host if request.client else "?"
    bucket = _hits.setdefault(f"{key}:{ip}", [])
    cutoff = time.time() - window
    _hits[f"{key}:{ip}"] = [t for t in bucket if t > cutoff] + [time.time()]
    if len(_hits[f"{key}:{ip}"]) > limit:
        raise HTTPException(429, "Too many requests — please wait a moment.")


def current_user(request: Request) -> User:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    try:
        payload = decode_token(auth[7:])
    except Exception:
        raise HTTPException(401, "Invalid or expired session")
    with SessionLocal() as s:
        user = s.get(User, int(payload["sub"]))
        if not user:
            raise HTTPException(401, "User no longer exists")
        s.expunge(user)
        return user


def audit(user_id, action, detail=""):
    with SessionLocal() as s:
        s.add(AuditLog(user_id=user_id, action=action, detail=detail[:500])); s.commit()


def own_project(user: User, project_id: int) -> Project:
    with SessionLocal() as s:
        p = s.get(Project, project_id)
        if not p or p.owner_id != user.id:
            raise HTTPException(404, "Project not found")
        s.expunge(p); return p


def own_job(user: User, job_id: int) -> ProcessingJob:
    with SessionLocal() as s:
        j = s.get(ProcessingJob, job_id)
        if not j:
            raise HTTPException(404, "Job not found")
        af = s.get(AudioFile, j.audio_file_id); p = s.get(Project, af.project_id) if af else None
        if not p or p.owner_id != user.id:
            raise HTTPException(404, "Job not found")
        s.expunge(j); return j


def owner_id_for_job(job_id: int) -> int | None:
    """Resolve a job's owner for signed, token-only media requests.

    Browser ``<audio>`` elements and ordinary download anchors cannot send a
    Bearer header. Those routes therefore authenticate the HMAC capability
    token first, then use this lookup to prove that the token's embedded,
    HMAC-covered user ID is also the owner of the underlying job. Possession
    of a signed URL for someone else's object is therefore not enough.
    """
    with SessionLocal() as s:
        job = s.get(ProcessingJob, job_id)
        if not job:
            return None
        audio_file = s.get(AudioFile, job.audio_file_id)
        if not audio_file:
            return None
        project = s.get(Project, audio_file.project_id)
        return int(project.owner_id) if project else None


@app.on_event("startup")
def _startup():
    init_db()


@app.get("/api/health")
def health():
    demucs_ok, demucs_why = engines.REGISTRY["htdemucs"].available()
    crepe_ok, crepe_why = vocal.crepe_available()
    rof_ok, rof_why = engines.REGISTRY["roformer"].available()
    from .audio_io import ffmpeg_available
    return {"status": "ok", "pipeline": PIPELINE_VERSION,
            "engines": {"dsp": True, "demucs": demucs_ok, "demucs_note": demucs_why,
                        "roformer": rof_ok, "roformer_note": rof_why,
                        "crepe": crepe_ok, "crepe_note": crepe_why, "ffmpeg": ffmpeg_available()},
            "retention_days": RETENTION_DAYS}


# ---------------------------------------------------------------- auth (§83)
class Credentials(BM):
    email: str
    password: str


@app.post("/api/auth/register")
def register(body: Credentials, request: Request):
    rate_limit(request, "auth", 10)
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", body.email) or len(body.password) < 8:
        raise HTTPException(422, "Enter a valid email and a password of at least 8 characters.")
    with SessionLocal() as s:
        if s.query(User).filter_by(email=body.email.lower()).first():
            raise HTTPException(409, "An account with this email already exists.")
        u = User(email=body.email.lower(), password_hash=hash_password(body.password),
                 is_admin=(body.email.lower() == ADMIN_EMAIL.lower() and bool(ADMIN_EMAIL)))
        s.add(u); s.commit(); s.refresh(u)
        token = make_token(u.id, u.email, u.is_admin)
        audit(u.id, "register")
        return {"token": token, "user": {"id": u.id, "email": u.email, "is_admin": u.is_admin}}


@app.post("/api/auth/login")
def login(body: Credentials, request: Request):
    rate_limit(request, "auth", 10)
    with SessionLocal() as s:
        u = s.query(User).filter_by(email=body.email.lower()).first()
        if not u or not verify_password(body.password, u.password_hash):
            raise HTTPException(401, "Email or password is incorrect.")
        return {"token": make_token(u.id, u.email, u.is_admin),
                "user": {"id": u.id, "email": u.email, "is_admin": u.is_admin}}


# ---------------------------------------------------------------- projects
class ProjectIn(BM):
    title: str


@app.get("/api/projects")
def list_projects(user: User = Depends(current_user)):
    with SessionLocal() as s:
        rows = s.query(Project).filter_by(owner_id=user.id).order_by(Project.created_at.desc()).all()
        out = []
        for p in rows:
            files = s.query(AudioFile).filter_by(project_id=p.id).all()
            jobs = [j for f in files for j in s.query(ProcessingJob).filter_by(audio_file_id=f.id).all()]
            stem_count = sum(s.query(Stem).filter_by(job_id=j.id).count() for j in jobs)
            out.append({"id": p.id, "title": p.title, "created_at": p.created_at.isoformat(),
                        "audio_files": len(files), "jobs": len(jobs), "stems": stem_count})
        return out


@app.post("/api/projects")
def create_project(body: ProjectIn, user: User = Depends(current_user)):
    with SessionLocal() as s:
        p = Project(owner_id=user.id, title=body.title.strip()[:255] or "Untitled")
        s.add(p); s.commit(); s.refresh(p)
        return {"id": p.id, "title": p.title}


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, user: User = Depends(current_user)):
    own_project(user, project_id)
    with SessionLocal() as s:
        files = s.query(AudioFile).filter_by(project_id=project_id).all()
        for f in files:
            storage.delete(f.storage_key)
            for j in s.query(ProcessingJob).filter_by(audio_file_id=f.id).all():
                storage.delete_prefix(f"stems/job-{j.id}")
                storage.delete_prefix(f"analysis/job-{j.id}")
                storage.delete_prefix(f"exports/job-{j.id}")
        s.delete(s.get(Project, project_id)); s.commit()
    audit(user.id, "delete_project", str(project_id))
    return {"deleted": True}


@app.get("/api/projects/{project_id}")
def get_project(project_id: int, user: User = Depends(current_user)):
    p = own_project(user, project_id)
    with SessionLocal() as s:
        files = []
        for f in s.query(AudioFile).filter_by(project_id=p.id).order_by(AudioFile.created_at.desc()).all():
            jobs = s.query(ProcessingJob).filter_by(audio_file_id=f.id).order_by(ProcessingJob.created_at.desc()).all()
            files.append({"id": f.id, "filename": f.filename, "meta": f.meta, "size_bytes": f.size_bytes,
                          "jobs": [job_summary(j) for j in jobs]})
        return {"id": p.id, "title": p.title, "audio_files": files}


# ---------------------------------------------------------------- uploads
@app.post("/api/projects/{project_id}/audio")
async def upload(project_id: int, request: Request, file: UploadFile = File(...),
                 user: User = Depends(current_user)):
    rate_limit(request, "upload", 20)
    own_project(user, project_id)
    data = await file.read()
    digest = hashlib.sha256(data).hexdigest()                      # §54 content-hash cache key
    safe = Path(file.filename or "audio").name.replace("/", "_")[:200]
    key = f"originals/{digest[:16]}_{safe}"
    storage.put_bytes(key, data)
    try:
        meta = validate_upload(storage.path(key), safe)
    except UploadValidationError as e:
        storage.delete(key)
        raise HTTPException(422, str(e))
    with SessionLocal() as s:
        existing = s.query(AudioFile).join(Project).filter(
            AudioFile.sha256 == digest, Project.owner_id == user.id).first()
        dup = bool(existing)
        af = AudioFile(project_id=project_id, filename=safe, storage_key=key, sha256=digest,
                       size_bytes=len(data), meta=meta)
        s.add(af); s.commit(); s.refresh(af)
    audit(user.id, "upload", safe)
    return {"audio_file_id": af.id, "filename": safe, "meta": meta,
            "duplicate_of_existing": dup,
            "notice": "Upload only audio you own, have permission to process, or are otherwise "
                      "legally entitled to use. Files are private by default."}


# ---------------------------------------------------------------- jobs
class JobIn(BM):
    audio_file_id: int
    quality: str = "balanced"          # fast|balanced|high|maximum
    profile: str = "choir"             # vocals_instrumental|full|extended|choir
    engine: str = "auto"               # auto|roformer|demucs|dsp
    vocal_analysis: bool = True
    all_voice_parts: bool = False


def job_summary(j: ProcessingJob) -> dict:
    return {"id": j.id, "state": j.state, "progress": j.progress, "message": j.message,
            "model": j.model_name, "model_version": j.model_version, "config": j.config,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "finished_at": j.finished_at.isoformat() if j.finished_at else None,
            "error": j.error or None, "warnings": j.warnings or []}


@app.post("/api/jobs")
def create_job(body: JobIn, request: Request, user: User = Depends(current_user)):
    rate_limit(request, "job", 10)
    if body.quality not in engines.QUALITY_PRESETS:
        raise HTTPException(422, f"quality must be one of {list(engines.QUALITY_PRESETS)}")
    if body.profile not in engines.PROFILES:
        raise HTTPException(422, f"profile must be one of {list(engines.PROFILES)}")
    if body.engine not in ("auto", "roformer", "demucs", "dsp"):
        raise HTTPException(422, "engine must be auto, roformer, demucs or dsp")
    with SessionLocal() as s:
        af = s.get(AudioFile, body.audio_file_id)
        if not af:
            raise HTTPException(404, "Audio file not found")
        own_project(user, af.project_id)
        dur = (af.meta or {}).get("duration", 0)
        j = ProcessingJob(audio_file_id=af.id, state="QUEUED",
                          config=body.model_dump(exclude={"audio_file_id"}))
        s.add(j); s.commit(); s.refresh(j)
        est = "under a minute" if dur < 90 else "approximately 1–4 minutes" if dur < 400 else "several minutes"
    backend = enqueue(j.id)
    audit(user.id, "create_job", str(j.id))
    return {**job_summary(j), "queue": backend,
            "estimated_processing_time": f"Estimated processing time: {est} (indicative only)."}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: int, user: User = Depends(current_user)):
    j = own_job(user, job_id)
    with SessionLocal() as s:
        stages = s.query(ProcessingStage).filter_by(job_id=job_id).all()
        return {**job_summary(j),
                "stages": [{"name": st.name, "state": st.state, "progress": st.progress,
                            "message": st.message, "duration_s": round(st.duration_s, 2)} for st in stages]}


@app.get("/api/jobs/{job_id}/events")
async def job_events(job_id: int, request: Request, user: User = Depends(current_user)):
    own_job(user, job_id)
    async def gen():
        last = ""
        for _ in range(600):                       # ~10 min ceiling
            with SessionLocal() as s:
                j = s.get(ProcessingJob, job_id)
                stages = s.query(ProcessingStage).filter_by(job_id=job_id).all()
                payload = {**job_summary(j),
                           "stages": [{"name": st.name, "state": st.state, "progress": st.progress,
                                       "message": st.message} for st in stages]}
            text = json.dumps(payload)
            if text != last:
                yield f"data: {text}\n\n"; last = text
            if payload["state"] in ("COMPLETED", "FAILED", "CANCELLED"):
                break
            await asyncio.sleep(1)
    return StreamingResponse(gen(), media_type="text/event-stream")


@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id: int, user: User = Depends(current_user)):
    own_job(user, job_id)
    with SessionLocal() as s:
        j = s.get(ProcessingJob, job_id)
        if j.state in ("COMPLETED", "FAILED"):
            return job_summary(j)
        j.state = "CANCELLED"; j.finished_at = now(); s.commit()
        return job_summary(j)


def stem_payload(st: Stem, user: User) -> dict:
    """One stem as the API returns it, with short-lived owner-bound media URLs."""
    return {
        "id": st.id, "name": st.name, "kind": st.kind, "voice_id": st.voice_id,
        "user_label": st.user_label, "quality": st.quality,
        "stream_url": f"/api/stems/{st.id}/stream?token={sign_download(st.preview_key or st.storage_key, user.id)}&preview=1",
        "download_url": f"/api/stems/{st.id}/download?token={sign_download(st.storage_key, user.id)}",
    }


@app.get("/api/jobs/{job_id}/results")
def job_results(job_id: int, user: User = Depends(current_user)):
    j = own_job(user, job_id)
    with SessionLocal() as s:
        stems = s.query(Stem).filter_by(job_id=job_id).all()
        voices = s.query(VoiceTrack).filter_by(job_id=job_id).all()
        af = s.get(AudioFile, j.audio_file_id)
        return {
            **job_summary(j),
            "audio_file": {"filename": af.filename, "meta": af.meta},
            "stems": [stem_payload(st, user) for st in stems],
            "voices": [{
                "voice_id": v.voice_id, "role": v.role, "classification": vocal.canonical_part(v.classification),
                "user_classification": vocal.canonical_part(v.user_classification) if v.user_classification else "",
                "confidence": v.confidence,
                **{k: val for k, val in (v.data or {}).items()
                   if k in ("predictions", "range", "pitch_statistics", "voiced_seconds",
                            "stem_available", "stem_unavailable_reason", "confidence_label", "predicted",
                            "chart_fit", "is_lead", "stem_note",
                            "assigned_part", "assignment")},
            } for v in voices],
            "report": j.report or {},
        }


@app.get("/api/jobs/{job_id}/pitch")
def job_pitch(job_id: int, user: User = Depends(current_user)):
    own_job(user, job_id)
    p = storage.path(f"analysis/job-{job_id}/pitch-data.json")
    if not p.exists():
        raise HTTPException(404, "No pitch analysis for this job")
    return JSONResponse(json.loads(p.read_text()))


# ---------------------------------------------------------------- stems
@app.get("/api/stems/{stem_id}/stream")
def stream_stem(stem_id: int, token: str, preview: int = 1):
    """Token-only media route for browser ``<audio>`` elements.

    The signed token identifies the owner; ownership of the stem's job is
    checked explicitly before any bytes are returned.
    """
    with SessionLocal() as s:
        st = s.get(Stem, stem_id)
        if not st: raise HTTPException(404, "Stem not found")
        job_id = st.job_id
        key = st.preview_key if preview and st.preview_key else st.storage_key
    token_user_id = verify_download(key, token)
    if token_user_id is None or owner_id_for_job(job_id) != token_user_id:
        raise HTTPException(403, "Invalid or expired stream token")
    media = "audio/mpeg" if key.endswith(".mp3") else "audio/wav"
    return FileResponse(storage.path(key), media_type=media)


@app.get("/api/stems/{stem_id}/download")
def download_stem(stem_id: int, token: str, format: str = "wav"):
    """Token-only download route usable from an ordinary browser link."""
    with SessionLocal() as s:
        st = s.get(Stem, stem_id)
        if not st: raise HTTPException(404, "Stem not found")
        job_id = st.job_id
        key, name = st.storage_key, st.name
    token_user_id = verify_download(key, token)
    if token_user_id is None or owner_id_for_job(job_id) != token_user_id:
        raise HTTPException(403, "Invalid or expired download token")
    src = storage.path(key)
    fmt = format.lower()
    if fmt in ("mp3", "flac") and not str(src).endswith(f".{fmt}"):
        from . import audio_io
        wav, sr = audio_io.load_audio(src)
        out = src.with_suffix(f".{fmt}")
        audio_io.save_audio(out, wav, sr, fmt=fmt.upper())
        audit(token_user_id, "download_stem", f"{name}.{fmt}")
        return FileResponse(out, filename=f"{name}.{fmt}")
    audit(token_user_id, "download_stem", f"{name}.wav")
    return FileResponse(src, filename=f"{name}.wav")


class StemPatch(BM):
    user_label: str | None = None
    voice_classification: str | None = None     # §75/111 human-in-the-loop correction


@app.patch("/api/stems/{stem_id}")
def patch_stem(stem_id: int, body: StemPatch, user: User = Depends(current_user)):
    with SessionLocal() as s:
        st = s.get(Stem, stem_id)
        if not st: raise HTTPException(404, "Stem not found")
        own_job(user, st.job_id)
        if body.user_label is not None:
            st.user_label = body.user_label[:64]
        if body.voice_classification is not None and st.voice_id:
            label = vocal.canonical_part(body.voice_classification)
            if label not in list(vocal.VOICE_PARTS) + ["unknown"]:
                raise HTTPException(422, "Unknown voice-part label")
            body.voice_classification = label
            vt = s.query(VoiceTrack).filter_by(job_id=st.job_id, voice_id=st.voice_id).first()
            if vt:
                vt.user_classification = body.voice_classification
        s.commit()
    audit(user.id, "correct_stem", str(stem_id))
    return {"ok": True, "note": "User classification stored separately from the AI classification (§111)."}


@app.delete("/api/stems/{stem_id}")
def delete_stem(stem_id: int, user: User = Depends(current_user)):
    with SessionLocal() as s:
        st = s.get(Stem, stem_id)
        if not st: raise HTTPException(404, "Stem not found")
        own_job(user, st.job_id)
        storage.delete(st.storage_key); storage.delete(st.preview_key)
        s.delete(st); s.commit()
    return {"deleted": True}


# ---------------------------------------------------------------- exports (§39-41, 81)
class ExportIn(BM):
    job_id: int
    format: str = "WAV"


class MinusOneIn(BM):
    without: str          # name of the stem to take out, e.g. "lead_vocal", "drums", "soprano"


@app.post("/api/jobs/{job_id}/minus-one")
def create_minus_one(job_id: int, body: MinusOneIn, request: Request, user: User = Depends(current_user)):
    """Practice mix: the original recording with one stem removed (see ``practice.py``).

    Idempotent: asking again for the same stem returns the existing mix. The result is
    stored as a stem of kind ``minus_one`` so it uses the same owner-bound signed URLs.
    """
    rate_limit(request, f"minus-one:{user.id}", limit=20, window=60)
    j = own_job(user, job_id)
    if j.state != "COMPLETED":
        raise HTTPException(409, "Job is not complete yet")
    with SessionLocal() as s:
        stems = s.query(Stem).filter_by(job_id=job_id).all()
        by_name = {st.name: st for st in stems}
        target = by_name.get(body.without)
        if target is None or target.kind in ("original", "minus_one"):
            raise HTTPException(422, "Choose an existing music, vocal or voice-part stem to remove")
        mix_stem = next((st for st in stems if st.kind == "original"), None)
        if mix_stem is None:
            raise HTTPException(409, "This job has no original mix to subtract from")
        name = f"minus_{target.name}"[:64]
        existing = by_name.get(name)
        if existing is not None:
            return stem_payload(existing, user)
        target_key, mix_key = target.storage_key, mix_stem.storage_key
    mix, sr = audio_io.load_audio(storage.path(mix_key))
    stem_audio, _ = audio_io.load_audio(storage.path(target_key))
    try:
        backing, gain = practice.minus_one_mix(mix, stem_audio)
    except ValueError:
        raise HTTPException(409, "The stem and the mix are not sample-aligned")
    base_dir = Path(target_key).parent.as_posix()
    stem_file = Path(target_key).name
    base = stem_file[: -len(f"_{target.name}.wav")] if stem_file.endswith(f"_{target.name}.wav") else Path(stem_file).stem
    key = f"{base_dir}/{base}_{name}.wav"
    preview_key = f"{base_dir}/{base}_{name}.preview.mp3"
    audio_io.save_audio(storage.path(key), backing, sr)
    try:
        audio_io.save_audio(storage.path(preview_key), backing, sr, fmt="MP3")
    except Exception:
        preview_key = key
    q = quality.assess_stem(name, backing, {}, mix)
    q["waveform"] = _waveform_peaks(audio_io.to_mono(backing))
    q["without"] = target.name
    q["gain_applied"] = round(gain, 4)
    if gain < 1.0:
        q.setdefault("warnings", []).append("Scaled down slightly to avoid clipping.")
    with SessionLocal() as s:
        st = s.query(Stem).filter_by(job_id=job_id, name=name).first()
        if st is None:
            st = Stem(job_id=job_id, name=name, kind="minus_one", storage_key=key,
                      preview_key=preview_key, voice_id="", quality=q)   # no voice link: it must not shadow the real part stem
            s.add(st); s.commit(); s.refresh(st)
        payload = stem_payload(st, user)
    audit(user.id, "minus_one", f"{job_id}:{target.name}")
    return payload


@app.post("/api/exports")
def create_export(body: ExportIn, user: User = Depends(current_user)):
    j = own_job(user, body.job_id)
    if j.state != "COMPLETED":
        raise HTTPException(409, "Job is not complete yet")
    if body.format.upper() not in ("WAV", "FLAC", "MP3"):
        raise HTTPException(422, "format must be WAV, FLAC or MP3")
    key = make_zip_export(body.job_id, body.format.upper())
    return {"download_url": f"/api/exports/download?key={key}&token={sign_download(key, user.id)}"}


@app.get("/api/exports/download")
def download_export(key: str, token: str):
    """Token-only ZIP download, scoped to the export record's job owner."""
    if not key.startswith("exports/"):
        raise HTTPException(403, "Invalid or expired export token")
    token_user_id = verify_download(key, token)
    if token_user_id is None:
        raise HTTPException(403, "Invalid or expired export token")
    with SessionLocal() as s:
        export = s.query(Export).filter_by(storage_key=key).first()
        if not export:
            raise HTTPException(404, "Export not found")
        job_id = export.job_id
    if owner_id_for_job(job_id) != token_user_id:
        raise HTTPException(403, "Invalid or expired export token")
    return FileResponse(storage.path(key), filename="separated-stems.zip", media_type="application/zip")


# ---------------------------------------------------------------- models + admin (§12/88/119)
@app.get("/api/models")
def list_models(user: User = Depends(current_user)):
    with SessionLocal() as s:
        rows = s.query(ModelRecord).all()
        out = []
        avail = {"htdemucs": engines.REGISTRY["htdemucs"].available(),
                 "htdemucs_6s": engines.REGISTRY["htdemucs"].available(),
                 "dsp-softmask": engines.REGISTRY["dsp-softmask"].available(),
                 "spleeter": engines.REGISTRY["spleeter"].available(),
                 "harmonic-mask-voice-separator": (True, "Built-in Level-2 separator.")}
        for m in rows:
            ok, why = avail.get(m.name, (False, "No adapter registered"))
            out.append({"name": m.name, "version": m.version, "provider": m.provider,
                        "license": m.license, "supported_sources": m.supported_sources,
                        "gpu_required": m.gpu_required, "enabled": m.enabled,
                        "available": bool(ok and m.enabled), "availability_note": why, "meta": m.meta})
        return out


@app.get("/api/admin/stats")
def admin_stats(user: User = Depends(current_user)):
    if not user.is_admin:
        raise HTTPException(403, "Admin only")
    with SessionLocal() as s:
        jobs = s.query(ProcessingJob).all()
        by_state = {}
        by_model = {}
        for j in jobs:
            by_state[j.state] = by_state.get(j.state, 0) + 1
            by_model[j.model_name or "(none)"] = by_model.get(j.model_name or "(none)", 0) + 1
        return {"users": s.query(User).count(), "projects": s.query(Project).count(),
                "jobs_by_state": by_state, "jobs_by_model": by_model,
                "stems": s.query(Stem).count(), "failures": by_state.get("FAILED", 0),
                "note": "GPU utilisation requires a GPU worker (queue backend: redis) — see docs/ARCHITECTURE.md §51-52."}


class ModelToggle(BM):
    enabled: bool


@app.patch("/api/admin/models/{name}")
def toggle_model(name: str, body: ModelToggle, user: User = Depends(current_user)):
    if not user.is_admin:
        raise HTTPException(403, "Admin only")
    with SessionLocal() as s:
        m = s.query(ModelRecord).filter_by(name=name).first()
        if not m: raise HTTPException(404, "Model not found")
        m.enabled = body.enabled; s.commit()
    audit(user.id, "toggle_model", f"{name}={body.enabled}")
    return {"ok": True}
