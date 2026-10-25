# Architecture

This document describes the standalone AI Music & Vocal Part Separator under `vocal-separator/`. It is deliberately explicit about what is implemented, what degrades safely, and where production scale needs additional infrastructure.

## 1. Product workflow

```text
Upload → Validate → Analyze → Separate → Inspect → Solo/Mute → Refine/Practice → Download
```

The user owns projects. Each project contains uploaded audio files. Each audio file can have multiple processing jobs. A completed job owns stems, detected voice tracks, analysis artifacts, a processing report, and optional ZIP exports.

## 2. High-level system

```text
┌────────────────────────────── Browser ──────────────────────────────┐
│ React/Vite workspace                                                │
│ - auth/session                                                      │
│ - project + upload workflow                                         │
│ - job polling                                                       │
│ - synchronized stem mixer (Web Audio gain/pan + signed media)       │
│ - pitch roll, voice evidence, corrections, export actions          │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ same-origin /api
                               │ Vite proxy (dev) / Nginx proxy (Docker)
┌──────────────────────────────▼───────────────────────────────────────┐
│ FastAPI application (`backend/app/main.py`)                          │
│ - JWT authentication + owner scoping                                 │
│ - project/audio/job/stem/export/model/admin endpoints                │
│ - rate-limited auth/media paths                                      │
│ - short-lived owner-bound signed media/export URLs                  │
│ - audit logging                                                      │
└───────────────┬───────────────────────┬──────────────────────────────┘
                │                       │
                │ SQLAlchemy            │ queue abstraction
                ▼                       ▼
┌──────────────────────┐   ┌───────────────────────────────────────────┐
│ SQLite locally       │   │ Inline bounded thread queue (default)    │
│ PostgreSQL in Docker │   │ Redis + `python -m app.worker` (scale)   │
└──────────────────────┘   └──────────────────┬────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────────┐
                              │ Staged audio pipeline             │
                              │ validation → decode → Level 1     │
                              │ vocal analysis → Level 2 masks    │
                              │ quality → previews → reports      │
                              └──────────────────┬────────────────┘
                                                 │
                                                 ▼
                              ┌───────────────────────────────────┐
                              │ Traversal-protected local storage │
                              │ originals / intermediate / stems  │
                              │ analysis / exports                │
                              └───────────────────────────────────┘
```

## 3. Backend module map

| Module | Responsibility |
|---|---|
| `app/config.py` | Environment-driven settings: storage, database, queue, secrets, limits, retention, worker count, engine selection, Demucs model, ffmpeg path. |
| `app/db.py` | SQLAlchemy models and database initialization. |
| `app/security.py` | PBKDF2 password hashing, HS256 JWTs, and HMAC signed download/stream capability tokens. |
| `app/storage.py` | Server-generated file keys and traversal-safe local path resolution. |
| `app/validation.py` | Upload size/duration limits, magic-byte sniffing, codec probing, and honest errors for unsupported media. |
| `app/audio_io.py` | SoundFile-based decode/encode plus optional ffmpeg fallback. |
| `app/dsp.py` | STFT/ISTFT, Wiener-style soft-mask partitioning, frequency bands, RMS and pitch helpers. |
| `app/engines.py` | `SeparationModel` abstraction, profiles, quality presets, exact-sum DSP engine, Demucs subprocess adapter, and unavailable-model metadata. |
| `app/vocal.py` | Polyphonic pitch candidates, voice-leading track formation, probabilistic voice-part classification, harmonic masks, and optional CREPE probe. |
| `app/quality.py` | Reference-free energy, silence, clipping, bleed-proxy, alignment and reconstruction evidence. |
| `app/pipeline.py` | Job state machine execution, staged processing, artifacts, previews, reports and ZIP export creation. |
| `app/jobs.py` | Bounded in-process queue and Redis-backed worker loop. |
| `app/worker.py` | Standalone Redis worker entrypoint. |
| `app/main.py` | HTTP API, ownership checks, signed media routes, model/admin surface, rate limits and audit events. |

## 4. Frontend module map

| File | Responsibility |
|---|---|
| `web/src/App.tsx` | Auth gate, project library, upload/configuration workflow, job history/progress, results summary, voice cards, report, model/admin panels. |
| `web/src/api.ts` | Typed same-origin API client, session persistence and FastAPI error parsing. |
| `web/src/types.ts` | Shared API contracts for users, projects, jobs, stems, voices, reports, pitch data and models. |
| `web/src/components/StemMixer.tsx` | Synchronized signed-preview playback, Web Audio gain/pan, A/B original, presets, looping, tempo, practice solo, quality views, labels and downloads. |
| `web/src/components/Waveform.tsx` | Canvas waveform with playhead and click/keyboard seek. |
| `web/src/components/PitchRoll.tsx` | Canvas pitch-track visualization with note/time grids and voice legend. |
| `web/src/lib/utils.ts` | Stem ordering/naming, confidence presentation and formatting helpers. |
| `web/nginx/default.conf.template` | Production SPA hosting, immutable asset caching and same-origin `/api` proxying without buffering long-lived progress responses. |

## 5. Processing pipeline

A job is persisted before processing begins. The pipeline updates the job and its stage rows as it advances so progress survives API polling and can be resumed/inspected operationally.

### 5.1 Stage outline

1. **Load/validate input** — resolve the owner-scoped original, inspect metadata and enforce limits.
2. **Decode/preprocess** — decode to floating-point samples; preserve sample count/duration; use ffmpeg only when the deployment provides it.
3. **Level-1 separation** — run the selected engine/profile/quality:
   - Demucs subprocess adapter when truly installed and its weights are reachable.
   - Exact-sum chunked DSP soft-mask engine otherwise in Auto/DSP modes.
   - Residual energy is folded into `other`; `instrumental = mix − vocals`.
4. **Write lossless working stems** — stems remain sample/time aligned with the input.
5. **Vocal analysis (optional)** — run pitch salience, multi-pitch selection, track linking/merging, range estimation and probabilistic classification.
6. **Level-2 reconstruction** — build harmonic soft masks only for tracks passing the evidence/confidence gates.
7. **Quality analysis** — calculate per-stem energy/silence/clipping/bleed proxies and reconstruction/alignment evidence where meaningful.
8. **Previews/artifacts** — create compact playback previews and store pitch/analysis JSON.
9. **Report/finalize** — persist stems, voice tracks, warnings and processing report; mark the job completed or retain partial artifacts with an explicit failure state.

### 5.2 Invariants

- User-visible stems are never fabricated for an unavailable adapter.
- Voice-part stems require sufficient evidence; insufficient lines remain analysis-only or Unknown.
- All generated stems are time-aligned to the original duration.
- The default DSP Level-1 components sum to the mix by construction.
- Lossy compression is an export choice, not the internal working format.
- A user correction is stored separately from the system classification.
- Browser media routes require a valid owner-bound capability token; the token owner must match the database owner.

## 6. Data model

The SQLAlchemy schema centres on owner-scoped projects and persisted job state.

```text
User 1───* Project 1───* AudioFile 1───* ProcessingJob
                                      ├───* JobStage
                                      ├───* Stem
                                      ├───* VoiceTrack
                                      └───* Export

User 1───* AuditLog
ModelRegistry (global/admin-managed)
```

Important entities:

- **User** — credentials, admin flag and timestamps.
- **Project** — owner and title.
- **AudioFile** — project, generated storage key, original filename, checksum/metadata and size.
- **ProcessingJob** — state, progress, selected engine/profile/quality, model/version, warnings, error and report reference.
- **JobStage** — stage name/state/progress/message/duration.
- **Stem** — job, name/kind, optional voice ID, storage/preview keys, user label and quality JSON.
- **VoiceTrack** — job, system classification, user classification, confidence/probabilities, range/statistics and export eligibility.
- **Export** — job, format and generated ZIP storage key.
- **ModelRegistry** — adapter metadata, capabilities, licence, availability and enabled state.
- **AuditLog** — actor/action/resource detail for security-relevant operations.

SQLite is the zero-config local database. Docker Compose uses PostgreSQL through the same SQLAlchemy models.

## 7. Queueing and execution modes

### Inline mode (default local)

- A bounded thread queue runs jobs in the API process.
- `WORKER_THREADS` defaults to one because audio separation is memory-heavy.
- Best for local development, demos and single-user deployments.

### Redis mode (production scaffolding)

- Set `QUEUE_BACKEND=redis` and `REDIS_URL`.
- Run one or more workers with `python -m app.worker`.
- The API persists/enqueues the job; workers execute the same pipeline and update the same database/storage.
- Docker Compose wires API + worker + Redis + PostgreSQL + shared `/data` volume.

For true multi-host production, local disk should be replaced by object storage and workers placed behind autoscaling/resource controls.

## 8. Storage layout

Generated keys are resolved under `STORAGE_DIR` with traversal protection:

```text
storage/
├── originals/       # validated uploads
├── intermediate/    # temporary/engine working files
├── stems/           # lossless stems and previews
├── analysis/        # pitch tracks and processing reports
└── exports/         # ZIP archives
```

Original client filenames are metadata only; they are never trusted as physical paths.

## 9. Authentication and signed media

JSON API routes use bearer JWTs. Browser `<audio>` elements and ordinary download links cannot attach Authorization headers, so stream/download/export routes accept a short-lived signed capability token instead:

```text
user_id.expiry.signature
```

The signature binds the user, expiry and resource key. After cryptographic verification, the API loads the target stem/export and verifies that the token user owns the parent job through `ProcessingJob → AudioFile → Project.owner_id`. Therefore a valid token for one resource/user cannot be replayed against another owner's resource.

See `docs/API.md` for endpoint-level details.

## 10. Deployment topologies

### Local development

```text
Vite :5174 ──proxy /api──► Uvicorn :8000 ──► SQLite + inline queue + local files
```

### Docker Compose

```text
Nginx web :5174 ──/api──► FastAPI :8000 ──► PostgreSQL
                              │                 Redis
                              └──── shared /data ◄──── worker
```

The browser never calls a container hostname or localhost backend directly in production; it uses same-origin `/api`.

## 11. Failure behaviour

- Unsupported/undecodable uploads fail validation with an explicit reason.
- Demucs-only mode fails clearly if Demucs/weights are unavailable.
- Auto mode records the visible DSP fallback rather than claiming an ML result.
- Silent/insufficient vocals skip voice-part export while retaining Level-1 outputs.
- Ambiguous vocal lines return Unknown with probabilities instead of forced labels.
- Expired or malformed signed URLs are rejected.
- Resource access returns owner-scoped errors without leaking another user's files.

## 12. Testing strategy

The backend test suite combines:

- DSP exact-reconstruction and sample-alignment checks.
- A synthetic ground-truth SATB fixture with vibrato/harmonics and accompaniment.
- Track-count, pitch-detection and soprano reconstruction SNR assertions.
- Honest handling of ambiguous classification.
- End-to-end API registration/project/upload/job/results/export flow.
- Signed stream/download/export access without Authorization headers.
- Malformed-token rejection and owner-bound media checks.

The web production build runs TypeScript checking plus Vite bundling.

## 13. Production extension points

- Replace local storage with S3/GCS-compatible object storage and signed object URLs.
- Add dedicated GPU worker pools for Demucs/RoFormer-class models.
- Add malware scanning and content-policy review queues.
- Add resumable/chunked uploads for very large files.
- Add job retries with idempotency keys and dead-letter handling.
- Add observability dashboards for stage duration, queue depth, failures and model quality.
- Add account deletion/export workflows and scheduled retention enforcement.
- Add stronger neural vocal diarization and source-specific reconstruction models behind the existing engine abstraction.
