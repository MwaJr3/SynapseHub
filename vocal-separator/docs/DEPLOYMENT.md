# Deployment guide

This guide covers the supported local and Docker Compose deployments for the standalone app in `vocal-separator/`, plus the changes required before calling a public deployment production-grade.

## 1. Deployment options

| Mode | Intended use | Database | Queue | Storage |
|---|---|---|---|---|
| Local development | Development and evaluation | SQLite by default | Inline bounded thread queue | Local `backend/data/` |
| Docker Compose | Single-host demo or small private deployment | PostgreSQL | Redis + separate worker | Shared Docker volume |
| Managed production | Public/multi-user service | Managed PostgreSQL | Redis/managed queue + autoscaled workers | Private object storage (future adapter) |

The code provides the first two modes today. The third requires replacing the local storage adapter and adding operational controls described below.

## 2. Local development

### Backend

```bash
cd vocal-separator
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Web

```bash
cd vocal-separator/web
npm install
npm run dev
```

Vite serves on port 5174 and proxies same-origin `/api` requests to `http://localhost:8000` by default. To use a different development API target:

```bash
VITE_API_PROXY_TARGET=http://127.0.0.1:8000 npm run dev
```

The proxy target is used by the Vite process, not embedded as a browser-facing localhost URL.

### Optional local ML dependencies

```bash
pip install -r backend/requirements-ml.txt
```

Installing the packages is not sufficient: Demucs/CREPE model weights must also be available. Verify the model registry and `/api/health` after installation. See [`ML_NOTES.md`](ML_NOTES.md).

## 3. Docker Compose

### 3.1 Configure

```bash
cd vocal-separator
cp .env.example .env
```

Before exposing the stack beyond your own machine, set at least:

```dotenv
JWT_SECRET=<generate-a-long-random-secret>
POSTGRES_PASSWORD=<generate-a-strong-password>
ADMIN_EMAIL=<your-admin-email>
```

Generate a secret with a password manager or a command such as:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 3.2 Build and start

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f api worker web
```

Default URLs:

- Web: <http://localhost:5174>
- API: <http://localhost:8000/api/health>

Ports can be changed with `WEB_PORT` and `API_PORT` in `.env`.

### 3.3 Services

`docker-compose.yml` defines:

- `web` — production React build served by Nginx, with `/api` reverse-proxied to the API.
- `api` — FastAPI under Uvicorn.
- `worker` — `python -m app.worker`, consuming Redis jobs.
- `db` — PostgreSQL 16.
- `redis` — Redis 7 with append-only persistence.

The API and worker share the `app-data` volume at `/data`. PostgreSQL and Redis have separate named volumes.

### 3.4 Optional ML image

The backend image is light by default and uses the DSP engine. To build the optional ML dependency layer:

```dotenv
INSTALL_ML=true
SEPARATION_ENGINE=auto
DEMUCS_MODEL=htdemucs
```

Then rebuild:

```bash
docker compose build api worker
docker compose up -d
```

Expect a much larger image and substantially higher CPU/RAM use without a GPU. Model weights may download into the runtime cache on first use unless pre-seeded. For repeatable production, bake or mount **verified** weights and record their source/checksums rather than depending on first-request downloads.

### 3.5 Stop and remove

Stop containers while preserving volumes:

```bash
docker compose down
```

Delete containers **and all database/audio volumes**:

```bash
docker compose down -v
```

The second command permanently deletes uploaded audio, stems and database records stored in those volumes.

## 4. Environment variables

| Variable | Default / example | Purpose |
|---|---|---|
| `WEB_PORT` | `5174` | Host port for the Docker web service |
| `API_PORT` | `8000` | Host port for the Docker API service |
| `INSTALL_ML` | `false` | Build-time switch for optional ML dependencies |
| `POSTGRES_DB` | `vocal_separator` | Compose PostgreSQL database |
| `POSTGRES_USER` | `vocal_separator` | Compose PostgreSQL user |
| `POSTGRES_PASSWORD` | change required | Compose PostgreSQL password |
| `DATABASE_URL` | SQLite local / PostgreSQL in Compose | SQLAlchemy database URL |
| `QUEUE_BACKEND` | `inline` local / `redis` in Compose | Job execution backend |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `DATA_DIR` | local data directory / `/data` in image | Base runtime data path |
| `STORAGE_DIR` | `<DATA_DIR>/storage` | Audio and artifact storage |
| `JWT_SECRET` | must override | JWT and signed-token secret material |
| `JWT_TTL_HOURS` | `72` | Login token lifetime |
| `DOWNLOAD_TOKEN_TTL` | `3600` | Signed media/export URL lifetime in seconds |
| `ADMIN_EMAIL` | empty | Email recognized as administrator |
| `MAX_UPLOAD_MB` | `100` | Upload size limit |
| `MAX_DURATION_S` | `1200` | Decoded duration limit |
| `RETENTION_DAYS` | `7` | Retention setting reported/enforced by lifecycle operations |
| `WORKER_THREADS` | `1` | Inline worker concurrency; keep low for audio jobs |
| `SEPARATION_ENGINE` | `auto` | `auto`, `dsp`, or `demucs` |
| `DEMUCS_MODEL` | `htdemucs` | Demucs model identifier |
| `FFMPEG_BINARY` | `ffmpeg` | Path/name of ffmpeg executable |

Do not commit `.env`. The included `.gitignore` excludes it while preserving `.env.example`.

## 5. Reverse proxy and HTTPS

For a public deployment, place the Compose `web` service behind a TLS-terminating reverse proxy or use the platform's HTTPS load balancer.

Requirements:

- Redirect HTTP to HTTPS.
- Preserve `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto`.
- Allow request bodies at least as large as `MAX_UPLOAD_MB` plus multipart overhead.
- Do not buffer long-lived job progress/SSE-style responses.
- Set API/upload timeouts long enough for large file transfer, while still protecting against slow-client abuse.
- Do not expose PostgreSQL or Redis publicly.
- Prefer exposing only the web service; keep the API reachable through the same-origin `/api` proxy where possible.

The bundled Nginx template already sets `client_max_body_size 120m`, disables API proxy buffering and uses `API_UPSTREAM=http://api:8000` inside the Compose network.

## 6. Resource planning

Audio separation is CPU-, RAM- and disk-heavy.

- Start with one worker per host/process pool until memory is measured.
- Long/high-sample-rate files multiply STFT and stem storage requirements.
- ZIP exports duplicate audio into archives; reserve temporary disk.
- Demucs on CPU can be slow. A GPU worker pool is strongly recommended for public ML processing.
- Apply per-user quotas/concurrency limits before accepting untrusted traffic.
- Monitor queue latency, stage duration, worker memory, disk growth and failure rate.

## 7. Backups and retention

Back up together:

1. PostgreSQL database;
2. `app-data` volume/object-storage bucket;
3. deployment environment/secrets through a secret manager;
4. model weight provenance/checksums.

A database-only backup is insufficient because stems and originals live in file storage.

Operational policy should define:

- how long originals, stems, previews and exports are retained;
- how user deletion removes files and database rows;
- how failed/expired artifacts are purged;
- backup retention and restoration drills;
- legal/copyright complaint handling.

## 8. Security checklist for public deployment

- [ ] Replace every example secret/password.
- [ ] Serve only over HTTPS.
- [ ] Restrict database/Redis to the private network.
- [ ] Configure firewall/security groups.
- [ ] Add malware scanning for uploaded files.
- [ ] Add per-account upload/job/storage quotas.
- [ ] Rate-limit authentication and expensive endpoints at the edge as well as in the API.
- [ ] Implement scheduled retention cleanup and account deletion/export procedures.
- [ ] Add centralized logs, metrics, alerting and audit-log review.
- [ ] Pin base images/dependencies and run vulnerability scanning.
- [ ] Verify model weight licences and checksums.
- [ ] Add Terms of Use, Privacy Policy and copyright/DMCA process.
- [ ] Test backup restoration.

## 9. Scaling path

1. Keep the API stateless; scale it horizontally behind the proxy.
2. Scale Redis workers independently, with separate CPU and GPU pools.
3. Replace local file storage with private S3/GCS-compatible object storage.
4. Move signed downloads to short-lived object-storage URLs or an authenticated media gateway.
5. Add job priority, idempotency keys, retry/backoff and a dead-letter queue.
6. Split long-running export/transcode work from separation jobs.
7. Add resumable uploads for large recordings.
8. Introduce model-specific autoscaling based on queue depth and measured job duration.

## 10. Troubleshooting

### Web loads but API calls fail

Check:

```bash
docker compose ps
docker compose logs api web
curl http://localhost:8000/api/health
curl http://localhost:5174/api/health
```

If direct API health works but the web-proxied health does not, inspect the Nginx template and confirm `API_UPSTREAM=http://api:8000` inside the web container.

### Jobs remain queued in Docker

Check the worker and Redis:

```bash
docker compose logs -f worker redis
```

Confirm both API and worker use `QUEUE_BACKEND=redis` and the same `REDIS_URL`.

### Demucs is unavailable

Package presence and model availability are different. Check `/api/health`, the Models panel/API, network access to weight hosts, disk space and worker logs. Auto mode should visibly fall back to DSP; Demucs-only mode should fail clearly.

### M4A/AAC cannot be decoded locally

Install ffmpeg or use the Docker backend image, which includes it.

### Signed playback/download returns 403

The link may have expired, been altered, or been requested for a different resource/owner. Refresh job results to receive a fresh signed URL and confirm the signed-in account owns the project.

### Disk fills quickly

Reduce upload duration/size, shorten retention, delete projects/exports, and inspect the `app-data` volume. Lossless multi-stem output is several times larger than a compressed input.
