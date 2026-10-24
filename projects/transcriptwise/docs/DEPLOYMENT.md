# Deployment and operations

## Status and required boundary

The app was exercised locally with SQLite and a real PostgreSQL server. A container recipe and ingress example are included, but **Docker execution, TLS issuance, a hosted deployment, CI on a remote runner, load testing and an independent security review were not performed**. Validate them in the intended environment. Use a private beta until identity/recovery and operational policies meet your requirements.

Run **one instance, one Uvicorn process, one in-process worker**. Multiple replicas or `--workers 2` are unsupported even with PostgreSQL. Do not run the Vite development server in production.

## Compose recipe

Requirements: Docker Engine/Compose, sufficient disk, and a domain/TLS ingress for production. From root:

1. Copy `.env.production.example` to `.env` for HTTPS production, or `.env.example` for a loopback-only local trial.
2. Set a unique URL-safe `POSTGRES_PASSWORD`, e.g. from `python -c "import secrets; print(secrets.token_urlsafe(32))"`. The Compose URL interpolates it directly; use URL-safe characters. Do not use an account's actual password.
3. Replace the example domain in hosts/origins and the Nginx file. Production needs `APP_ENV=production` and `COOKIE_SECURE=true`. A local HTTP trial needs development mode and insecure local cookies only.
4. Add actual provider values only if enabling external AI/authorized captions. Keep default local mode if not.
5. Validate without printing secrets: `docker compose config --quiet`.
6. Build/start: `docker compose up --build -d`.
7. Inspect health: `docker compose ps`; check logs locally with `docker compose logs app`. Do not post environment/config/log output publicly without review.

The image builds the frontend with Node 22, installs hashed runtime Python dependencies, runs as UID 10001, applies migrations, and serves the built SPA/API on port 8000. Compose uses PostgreSQL 17, a persistent named volume, a read-only app filesystem/tmpfs, no extra Linux capabilities, and no published database port. The app is published on `127.0.0.1:8000` by default. A Dockerfile health check calls `/api/v1/health`; allow localhost in trusted hosts for that local check.

Use `http://localhost:8000` only for the development-mode trial. A production browser must use the real HTTPS origin; Secure cookies intentionally do not support ordinary remote HTTP. Reverse-proxy the loopback service. Apply `deployment/nginx.conf.example` inside an appropriate Nginx configuration, supply valid certificates, verify with `nginx -t`, then reload. This repository does not obtain certificates or configure DNS/firewalls automatically.

`docker compose down` stops services without deleting the named database volume. **`docker compose down -v` destroys that volume.** PostgreSQL's initial password is applied when the data directory is first initialized; changing `.env` later does not automatically rotate an existing database role password.

## Non-container service

Create a dedicated unprivileged service user, a protected virtual environment/configuration, and a PostgreSQL database/role. Install runtime dependencies with CPython 3.13:

```bash
python -m pip install --require-hashes -r backend/requirements.lock
cd frontend && npm ci && npm run build && cd ../backend
python -m alembic upgrade head
SERVE_FRONTEND=true python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --no-proxy-headers --no-access-log --loop asyncio --http h11
```

Export the production environment through your service manager; the `.env` file is a convenient local option, not a substitute for secret-management policy. Set `DATABASE_URL=postgresql+psycopg://...`, with URL-encoded credentials. The backend working directory must be `backend/`, and `FRONTEND_PATH` must identify the built assets if you moved them. Startup refuses missing/outdated migrations.

A service manager should restart a failed process and provide controlled shutdown. Keep app/database access private to the ingress/service network. The ASGI server deliberately ignores untrusted proxy headers. Behind a shared proxy peer, in-app per-peer limits can become a conservative global cap; use client-aware edge limits and tune app limits consciously. Never solve this by trusting arbitrary forwarded headers.

## Migrations and releases

1. Back up the database and verify the backup before a release.
2. Review migration SQL/behavior, particularly SQLite batch-table changes and any future destructive changes.
3. Stop/drain the single app worker during schema changes. An already-sent model request can still cost money until it returns/times out.
4. Run `alembic upgrade head` from backend (the container entrypoint does this).
5. Start the one app instance and verify health, a fresh guest input/review/guide, login/library ownership, a saved-note edit and each export.
6. Keep the preceding source/image and a database restoration plan. A code downgrade alone is not a safe database rollback. Do not interrupt a migration or assume every downgrade preserves data.

Interrupted processing is recovered as explicitly retryable with compatible initial checkpoints. A provider/prompt change can require starting a new guide; it will not silently reuse mixed-engine material. Frontend cache should serve current `index.html`; hashed assets can be cached longer. API and private export responses must not be cached by a CDN.

## Backups and restore

For Compose, a typical database backup is:

```bash
mkdir -p backups
chmod 700 backups
docker compose exec -T db pg_dump -U transcriptwise -d transcriptwise -Fc > backups/transcriptwise.dump
```

Treat this file as sensitive: it contains source text, notes, account hashes and activity. Store encrypted off-host copies according to a documented retention/access policy. Add `backups/` to local exclusions if creating it within your source checkout (the supplied ZIP packager only includes allowlisted source roots).

Restore **into an isolated test database first** using PostgreSQL's matching tools. Check migration revision, private ownership, source/ref fidelity, login and exports. Do not restore over an active application without a deliberate recovery plan. For SQLite trials, stop the app and use SQLite's backup API or a consistent database/WAL-aware backup; blindly copying an open main `.db` file is not sufficient.

## Monitoring and resource policy

Watch `/api/v1/health`, worker liveness, queued/failed jobs, source/database growth, disk, memory, provider timeouts/rate limits and costs. Set model/API budgets at the provider as well. Default uploaded/accepted input limits are intentional. Raising them, chunk output budgets or job quotas increases memory, storage and financial exposure. The 1 GB Compose app limit is a starting point, not a load-tested capacity guarantee.

Guest/unsaved/task cleanup occurs at startup and hourly with the worker enabled. Logs/backups/provider retention are separate. Establish restore drills, security patching, dependency audits and incident/revocation procedures. Before a broadly public service, add verified email/recovery/MFA as appropriate and conduct independent security/accessibility tests, browser coverage, capacity testing and a deployment-specific legal/privacy review.
