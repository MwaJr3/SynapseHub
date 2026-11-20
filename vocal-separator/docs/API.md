# API specification

The web client uses same-origin `/api` paths. In local development Vite proxies them to FastAPI; in Docker, Nginx proxies them to the API container. Browser code should never call a backend container hostname or a hard-coded localhost service directly.

All request and response bodies are JSON unless an endpoint explicitly returns audio or a ZIP archive.

## 1. Authentication model

### 1.1 JSON API authentication

Register or log in to receive a session object containing a bearer JWT and the current user.

```http
Authorization: Bearer <jwt>
```

Protected JSON endpoints derive ownership from the JWT subject. Users can access only their own projects, audio files, jobs, stems, voice tracks and exports.

### 1.2 Signed browser media URLs

Native browser playback and download navigation cannot reliably attach `Authorization` headers. Stem `stream_url`, stem `download_url` and export download URLs therefore contain a short-lived HMAC capability token.

A signed token does **not** grant access by itself. The server verifies all of the following:

1. the token signature is valid;
2. the token has not expired;
3. the token is bound to the requested resource key;
4. the user encoded in the token is the database owner of the resource's parent job.

Malformed, expired or cross-owner tokens are rejected.

### 1.3 Errors

FastAPI error responses generally use:

```json
{ "detail": "Human-readable explanation" }
```

Validation failures may return `detail` as an array of field errors. The web client normalizes both forms.

Common status codes:

| Code | Meaning |
|---:|---|
| 400 | Invalid request or unsupported operation |
| 401 | Missing/invalid authentication |
| 403 | Authenticated principal/token does not own the resource, or signed token is invalid |
| 404 | Resource does not exist or is not visible to the caller |
| 413 | Upload exceeds size limits |
| 422 | Request validation failed |
| 429 | Rate limit exceeded |
| 500 | Unexpected server failure |

## 2. Health

### `GET /api/health`

No authentication.

Returns service status, pipeline identifier, engine availability notes, ffmpeg availability and the configured retention period.

Illustrative response:

```json
{
  "status": "ok",
  "pipeline": "vocal-separator",
  "engines": {
    "dsp": true,
    "demucs": false,
    "demucs_note": "...",
    "crepe": false,
    "crepe_note": "...",
    "ffmpeg": false
  },
  "retention_days": 7
}
```

The UI uses this endpoint to avoid claiming M4A/AAC or neural-model support when the deployment cannot actually provide it.

## 3. Authentication

### `POST /api/auth/register`

```json
{
  "email": "user@example.com",
  "password": "at-least-eight-characters"
}
```

Creates an account, hashes the password with a salted PBKDF2 scheme and returns a session.

### `POST /api/auth/login`

Accepts the same credentials shape and returns a new session for valid credentials.

Session response:

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "is_admin": false
  }
}
```

Authentication endpoints are rate-limited.

## 4. Projects

### `GET /api/projects`

Returns the caller's project summaries, including counts of audio files, jobs and stems.

### `POST /api/projects`

```json
{ "title": "Sunday choir rehearsal" }
```

Creates a project owned by the current user.

### `GET /api/projects/{project_id}`

Returns project detail with its audio files. Each audio file includes metadata, size and its processing-job summaries.

### `DELETE /api/projects/{project_id}`

Deletes the project and its dependent records/files according to the storage cleanup rules.

## 5. Audio upload

### `POST /api/projects/{project_id}/audio`

Multipart form field:

- `file`: the audio file

The server validates:

- ownership of the destination project;
- file size and decoded duration;
- magic bytes/content signature rather than extension alone;
- codec/container probing;
- sample rate, channels and decodability.

The response includes the new `audio_file_id`, original filename, normalized metadata, duplicate notice and any user-facing validation notice.

Example:

```bash
curl -X POST "$API/api/projects/1/audio" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@choir.wav"
```

If a format needs ffmpeg and the deployment does not provide it, the API returns an explicit decode limitation rather than fabricating metadata.

## 6. Processing jobs

### `POST /api/jobs`

Creates and queues a separation job.

```json
{
  "audio_file_id": 12,
  "quality": "balanced",
  "profile": "choir",
  "engine": "auto",
  "vocal_analysis": true
}
```

Fields:

| Field | Meaning |
|---|---|
| `audio_file_id` | Owned audio file to process |
| `quality` | `fast`, `balanced`, `high` or `maximum` preset |
| `profile` | Requested stem profile, such as vocals/instrumental, full, extended or choir |
| `engine` | `auto`, `dsp` or `demucs` selection semantics |
| `vocal_analysis` | Whether to run Level-2 voice tracking/classification/reconstruction |
| `all_voice_parts` | Default `false`. When `true` (needs `vocal_analysis`), every detected line is assigned to one of soprano, mezzo_soprano, alto, tenor, baritone, bass and exported as one merged stem per part. Lines the classifier would have withheld are marked `best_guess` (stem `quality.best_guess`, voice `assignment`). A part that clashes with a Level-1 name is exported as `<part>_voice` (e.g. `bass_voice`). `lead_vocal` is kept as a `derived` stem. Outcome code `all_voice_parts_ready`. |

The returned summary includes job ID, state, progress, message, model/version fields, config, timestamps, warnings and an estimated-processing-time note when available.

### `GET /api/jobs/{job_id}`

Returns the job summary plus persisted stages:

```json
{
  "id": 7,
  "state": "separating",
  "progress": 0.45,
  "stages": [
    {
      "name": "source_separation",
      "state": "running",
      "progress": 0.45,
      "message": "Separating broad music sources"
    }
  ]
}
```

The web workspace polls this endpoint while the job is non-terminal.

### `POST /api/jobs/{job_id}/cancel`

Records cancellation. If a worker is already inside a long model/subprocess call, cancellation may take effect at the next safe pipeline boundary.

## 7. Results

### `GET /api/jobs/{job_id}/results`

Returns the completed job summary enriched with:

- source audio filename and metadata;
- all existing stems with signed stream/download URLs;
- per-stem quality JSON and waveform summary when available;
- detected voices, probabilities, ranges and export eligibility;
- the full processing report.

Stem entries have the following conceptual shape:

```json
{
  "id": 101,
  "name": "soprano",
  "kind": "voice_part",
  "voice_id": "voice_1",
  "user_label": "",
  "quality": {
    "quality": "fair",
    "rms_dbfs": -24.1,
    "silence_ratio": 0.38,
    "warnings": ["..."]
  },
  "stream_url": "/api/stems/101/stream?token=...",
  "download_url": "/api/stems/101/download?token=..."
}
```

Only stems actually produced by the job are returned.

**Lead / backing vocals.** When one line clearly dominates, the results include a `lead_vocal` stem (`kind: "voice_part"`, experimental; linked to its voice through `voice_id`) and a `backing_vocals` stem (`kind: "derived"`, exactly `vocals − lead_vocal`). The lead is exported even when its voice part stays `unknown`. `report.voice_outcome` and `report.lead_split_outcome` carry a stable `code` plus a fixed `message` explaining what the voice-part step did. Each voice has `is_lead`, `chart_fit` and an optional `stem_note`.

### `GET /api/jobs/{job_id}/pitch`

Returns stored pitch-track analysis for visualization. The payload is either a voice-ID → pitch-points mapping or an object containing `pitch_tracks` with that mapping.

Pitch point shape:

```json
{
  "time": 1.25,
  "midi": 69.1,
  "frequency": 442.5,
  "note": "A4",
  "confidence": 0.83
}
```

If vocal analysis was disabled or produced no tracks, clients should handle an empty/error response gracefully and hide the pitch roll.

## 8. Stem media and correction

### Signed stream URL

The `stream_url` returned in results is intended for browser `<audio>` playback. It serves the compact preview representation when available and requires the signed owner-bound token embedded in the URL.

### Signed download URL

The `download_url` returns the working stem. Alternative final formats may be requested with the download format mechanism used by the web client:

```text
?format=flac
?format=mp3
```

WAV is the default lossless working format. FLAC is lossless; MP3 is a final-stage lossy export.

### `PATCH /api/stems/{stem_id}`

Authenticated JSON request.

```json
{
  "user_label": "Lead soprano — verse",
  "voice_classification": "soprano"
}
```

Either field may be supplied as supported by the client flow. A voice correction is stored separately from the system classification so model output remains auditable.

### `DELETE /api/stems/{stem_id}`

Deletes an owned stem and its stored representations.

### `POST /api/jobs/{job_id}/minus-one`

Builds a **practice mix**: the original recording with one stem taken out, for a singer or player who wants to supply that part themselves.

```json
{ "without": "lead_vocal" }
```

`without` is the name of any existing stem except `original` (a Level-1 stem such as `drums`, `lead_vocal`, or a voice part). The mix is the original minus that stem and is scaled down only if it would clip. The result is stored as a stem with `kind: "minus_one"` and `name: "minus_<stem>"`, returned in the same shape as the entries in `results.stems`, with signed `stream_url` / `download_url`. Asking again for the same stem returns the existing file. Errors: `409` while the job is not `COMPLETED`, `422` for an unknown stem name or `original`, `404` for another user's job.

## 9. ZIP exports

### `POST /api/exports`

```json
{
  "job_id": 7,
  "format": "WAV"
}
```

Accepted bundle formats are `WAV`, `FLAC` and `MP3`.

Returns a signed `download_url` for the generated ZIP. The archive includes existing stems in the requested format plus processing/analysis metadata such as `processing-report.json` and pitch-track data when available.

The export download route validates the signed token and the token owner's relationship to the export's job before streaming bytes.

## 10. Models and administration

### `GET /api/models`

Authenticated. Returns model-registry records:

- name and version;
- provider and licence;
- supported sources;
- GPU requirement;
- enabled flag;
- actual availability in this deployment;
- availability note explaining missing packages/weights when applicable;
- additional metadata such as expected quality.

The UI must not infer availability merely from a package appearing in a requirements file.

### `GET /api/admin/stats`

Admin only. Returns aggregate counts such as users, projects, stems and failures, plus operational notes when present.

### `PATCH /api/admin/models/{name}`

Admin only.

```json
{ "enabled": false }
```

Disabling a model removes it from normal selection without pretending its artifacts/results were generated by another engine.

## 11. Ownership and audit rules

- Every project-scoped query is filtered through the current user.
- Parent ownership is walked explicitly for nested resources.
- Download routes audit with the authenticated signed-token owner.
- Login, upload, job, correction, deletion, export and admin actions may write audit records.
- Public/anonymous access is limited to health and authentication endpoints, plus cryptographically signed media URLs that still require owner matching.

## 12. Client integration notes

- Persist only the session token/user needed by the browser; do not store passwords.
- Refresh results after label/classification mutations rather than rewriting server state locally.
- Treat missing stems and missing pitch data as valid partial results.
- Display job warnings and actual model provenance from the response.
- Do not construct storage paths client-side.
- Do not cache signed media URLs beyond the current result session; request fresh results when they expire.
