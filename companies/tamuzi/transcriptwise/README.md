# TranscriptWise

**Turn a transcript into a source-connected learning workspace.** A working React/TypeScript + FastAPI application, not a static dashboard. Paste text or upload TXT/SRT/VTT, review the source, choose learning preferences, and create an editable guide with study activities and portable exports.

The default **local extractive engine is a development alternative, not an LLM**. It organizes real excerpts and creates study templates without an API key. Configure a compatible language model for rewritten notes and deeper explanations. YouTube retrieval is a separate, official, permissioned adapter—not a scraper for arbitrary public videos.

## What is implemented

| Stage | Working functionality | Important boundary |
|---|---|---|
| 1 · Source to learning | Paste; UTF-8 TXT/SRT/VTT uploads; timestamp parsing; editable review; immutable original; objective/level/depth options; source references; structured guide; section editing/regeneration; quizzes; flashcards; personal notes; copy; Markdown/DOCX/JSON/print exports | Local mode extracts rather than infers or translates. Real AI requires server credentials. |
| 2 · Authorized retrieval | Strict YouTube URL normalization; public oEmbed metadata; official caption listing/download; optional OAuth refresh; explicit administrator video allowlist; progress/errors/languages; manual fallbacks | Caption access requires actual Google permissions **and** sharing authorization for each video. Public visibility is not permission. No live credentialed retrieval was available for verification. |
| 3 · Personal workspace | No-signup guest trial; Argon2 accounts; cookie sessions/CSRF; private persistent library; save/search/sort/filter/folders/tags; notes; study history/scheduling/activity; preferences; light/dark/system themes; responsive navigation; migrations; tests; deployment recipes | Single application process/worker. No email verification, password reset, MFA, collaboration, or horizontal scale. Not a production security certification. |

Source claims remain unverified. AI additions, examples, recommendations, direct quotations, and user edits are distinguished. Nothing here performs external fact-checking or measures mastery.

## Quick start · local development

Requirements: **CPython 3.13**, **Node.js 22 recommended** (20.19+ supported), npm, and a modern browser. SQLite is enough to try everything in the core workflow. PostgreSQL 17 is supported and was separately tested. The lockfiles are resolved with Python 3.13; use that version for reproducibility.

From the extracted `TranscriptWise/` directory:

```bash
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install --require-hashes -r backend/requirements-dev.lock
cp .env.example .env
cd frontend
npm ci
cd ..
python scripts/dev.py
```

Open **http://localhost:5308**. The real API runs at **http://localhost:8000**, with development docs at `/docs`. The runner applies migrations, starts both services, and shuts down both on Ctrl+C. Add `--reload` for Python auto-reload; Vite already supports frontend HMR. Alternate ports: `python scripts/dev.py --api-port 8010 --web-port 5312`.

Windows PowerShell, without requiring script activation:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --require-hashes -r backend/requirements-dev.lock
Copy-Item .env.example .env
Set-Location frontend
npm ci
Set-Location ..
.\.venv\Scripts\python.exe scripts/dev.py
```

Linux was the execution environment used for verification; Windows/macOS instructions are provided but were not executed. If a dependency has no wheel for your platform, use a supported CPython build or the Docker recipe; do not remove hash checks casually.

### Two-terminal alternative

Terminal 1, with the virtual environment active:

```bash
cd backend
python -m alembic upgrade head
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --no-proxy-headers --no-access-log --loop asyncio --http h11
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Browser calls always use relative `/api/v1` URLs. Vite proxies them to `http://127.0.0.1:8000`. Set **server-side** `VITE_API_TARGET` when the backend is on a different port. Do not put localhost API URLs or secrets in browser code.

## Try the complete workflow

1. Click **Try an example**, or paste your own transcript (at least 80 characters). The authored example is explicitly labeled; it is never substituted for a video.
2. Review the editable copy. Inspect the raw original, clean whitespace if needed, and choose an objective, explanation level, and depth. Timestamps and source IDs are preserved.
3. Choose **Create learning guide**. The worker reports actual chunk progress, persists validated checkpoints, and exposes partial/retry states rather than pretending a failed analysis is complete.
4. Explore takeaways, organized notes, concepts, source quotes, applications and other supported sections. Follow source references back to the transcript or a genuine video timestamp.
5. Take the quiz. Only multiple-choice/true-false answers are automatically graded; open-ended answers are self-assessed. Reveal a flashcard and rate your recall to schedule another review.
6. Add personal notes, edit a generated section, or regenerate only that section. Revision guards preserve concurrent/unrelated changes. Incomplete guides allow personal notes, but generated-section editing waits for initial completion so retries cannot replace those edits. **Guide options → New guide from this source** creates an editable duplicate without mutating existing guides.
7. Save the guide by creating an account or signing in. Guest content comes with you. Organize the library using folders and tags; search titles, notes, tags, and generated content.
8. Copy a section or the full guide. Export Markdown, Word `.docx`, or JSON; use the print view and your browser's **Print → Save as PDF**. There is no native server PDF generator.

Local mode omits unsupported inferred/technical explanations and never claims to rewrite or translate the source. Some source-dependent sections can be absent when no suitable material exists.

## Configuration

Copy `.env.example` to `.env` **at the project root**. The backend loads it; process environment variables take precedence. Restart the API after changes. `.env` is intentionally excluded from the ZIP, Git, and Docker build context.

- `DATABASE_URL`: defaults to SQLite relative to the backend working directory. For PostgreSQL use `postgresql+psycopg://USER:URL_ENCODED_PASSWORD@HOST:5432/transcriptwise`.
- `AI_PROVIDER=local` or `openai_compatible`. Real AI additionally needs `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`.
- `YOUTUBE_ALLOWED_VIDEO_IDS` plus an access token **or** OAuth refresh credentials enable caption attempts for authorized videos only.
- `APP_ENV=production` requires `COOKIE_SECURE=true`, explicit hosts, and HTTPS origins; it disables CDN-dependent interactive API docs. `/openapi.json` remains available.
- Defaults: 2 MB uploads, 300,000 transcript characters, 18,000-character AI chunks, 6,500 output tokens/chunk, 120-second AI timeout. Oversized input is rejected, not secretly shortened.
- Default protections: 120 API requests/minute/peer, 30 expensive requests/hour/peer, 30 analysis/regeneration/retry jobs per rolling 24 hours/workspace; authentication additionally has a fixed 20 requests/10 minutes/peer limiter.
- Keep `WORKER_ENABLED=true` and **exactly one application instance/worker**. Disabling it is useful in deterministic tests, not for a normal running product.

See [configuration and providers](docs/CONFIGURATION.md), [architecture](docs/ARCHITECTURE.md), and [security/privacy](docs/SECURITY_PRIVACY.md).

## Long transcripts and recoverability

All accepted source segments are assigned to chunks; there is no hidden “first N characters” analysis. Chunk plans retain a source fingerprint, engine fingerprint, prompt version and chunk size, so changing chunk-size configuration cannot skip/reuse incompatible source ranges on retry. Valid initial checkpoints survive restart. Interrupted tasks become explicitly retryable.

Outputs also have safety limits: 300 items per section and 150 questions/cards. If combined results exceed these, the workspace **explicitly reports an evenly distributed output selection**, including the end of the validated results. This is not input truncation. The original is retained, and JSON export includes the unabridged **initial** chunk results. It is not a full edit/regeneration version history. A provider/configuration change requires a new guide instead of silently mixing engines.

## Accounts, persistence, retention

- A guest can use the core workflow without registration; the workspace expires **7 days after creation** by default.
- Registration converts the current guest and rotates/revokes its previous sessions. Existing-account login adopts the current guest's records into that account.
- Account sessions default to 14 days. Unsaved account guides expire after **30 days without an edit**; opening a guide does not extend that period. Saved guides remain until deletion.
- Expired sessions/guests, old unsaved guides, old completed/failed tasks, and old unused source records are purged at worker startup and hourly while it runs.
- Guide deletion removes its notes/study activity and source if no other guide references it. Account/workspace deletion removes that owner's data; an account requires its current password.
- External providers and hosting backups have their own policies. Deleting application records cannot erase their copies. No backup policy, telemetry service, email service, or external analytics is silently configured.

The database is persistent but is not encrypted by this application. Use appropriate hosting storage encryption, access controls, backups, and a restore/retention policy.

## Tests

```bash
# From project root, virtual environment active:
python scripts/test.py

# Install Chromium once, then run full desktop/mobile workflows:
cd frontend
npx playwright install --with-deps chromium
cd ..
python scripts/test.py --e2e
```

E2E starts an isolated API/worker on **8001** and Vite on **5311**, migrates a fresh `.e2e/browser-tests.db`, and never uses the developer database. Those ports must be free. Set `TW_PYTHON` if your virtual environment is elsewhere. Browser tests use the real local engine/API/database; the unavailable YouTube response is a deterministic browser fixture. External adapters use deterministic HTTP transports.

PostgreSQL tests (this **erases that disposable test database**):

```bash
cd backend
TW_TEST_DATABASE_URL='postgresql+psycopg://USER:PASSWORD@localhost:5432/transcriptwise_test' ../.venv/bin/python -m pytest -q
```

The opt-in database name must end in `_test`. Do not point it at production. See [the verification report](docs/TEST_REPORT.md) for exact executed results, coverage, audits, and unverified integrations.

## Build and deploy

```bash
cd frontend
npm run build
cd ../backend
# With the appropriate runtime environment configured:
python -m alembic upgrade head
SERVE_FRONTEND=true python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --no-proxy-headers --no-access-log --loop asyncio --http h11
```

For a production environment, use HTTPS and explicit production configuration; do not use Vite as a production server. The built SPA and API can share one origin. A multi-stage `Dockerfile`, PostgreSQL `compose.yml`, non-root entrypoint, health checks, and an Nginx TLS/edge-limit example are provided.

For a local Compose trial, copy `.env.example`, generate and set a URL-safe `POSTGRES_PASSWORD` (e.g. `python -c "import secrets; print(secrets.token_urlsafe(32))"`), set `ALLOWED_ORIGINS=http://localhost:8000`, then:

```bash
docker compose config --quiet
docker compose up --build
# Open http://localhost:8000
```

Compose publishes the app on loopback and does not publish the database. **Docker image execution, a real TLS ingress, and a hosted production deployment were not verified in this environment.** Follow the [deployment guide](docs/DEPLOYMENT.md), including one-worker, reverse-proxy, backup, secret, and migration safeguards.

## Project map

```text
backend/
  app/api/             owned account/source/guide/library/study/export routes
  app/services/        parser, independent retrieval, task worker, merge, exports
  app/providers/       provider protocol, extractive and chat-completions adapters
  app/prompts/         versioned injection-separated learning prompt
  alembic/             database schema migrations
  tests/               parsing, API/security, adapters, concurrency and recovery
  requirements*.lock   pinned, hashed runtime/development dependencies
frontend/
  src/components/      source composer, dialogs, guide editing, quiz, flashcards
  src/pages/           workspace, review, guide, library, settings, help, about
  src/lib/             typed client, session/theme state, utilities and types
  src/tests/           mocked component/workflow tests
  e2e/                 real desktop/mobile Playwright + axe workflows
scripts/               development, test, and clean ZIP packaging helpers
deployment/            entrypoint and reverse-proxy example
docs/                  configuration, architecture, security, deploy, tests, limits
examples/              authored upload fixtures, not fetched video captions
```

## Honest limitations and next improvements

See [known limitations](docs/LIMITATIONS.md). Priority next work: verify the chosen live AI model and authorized Google account; add email verification/recovery/MFA before broader public use; conduct an independent security/accessibility review; build and smoke-test the container in its target environment; set up backups/restore tests and operational monitoring. A distributed queue/worker should be introduced **only** if multi-instance scale becomes necessary.

Dependency audit snapshots are included under `docs/`; they are point-in-time checks, not a guarantee against future vulnerabilities. Third-party dependencies retain their own licenses; see [dependency notes](docs/DEPENDENCIES.md).
