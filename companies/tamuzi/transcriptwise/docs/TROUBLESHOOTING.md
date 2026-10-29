# Troubleshooting

| Symptom | What to check |
|---|---|
| `No module named app` | Run backend commands from `backend/` with the project virtual environment. Use `python -m pytest`, not an unrelated global pytest executable. |
| Missing/outdated migrations at startup | From backend, run `python -m alembic upgrade head` using the same `DATABASE_URL`. Back up first for existing data. |
| SQLite file appears in the wrong directory | The SQLite URL is relative to process cwd. Use the supplied runner/backend cwd or an absolute SQLite URL. |
| PostgreSQL driver error | Use `postgresql+psycopg://`, not an implicit psycopg2 URL; install the locked requirements. URL-encode reserved credential characters. |
| `tsc`, Vite, fonts or modules missing | Run `npm ci` in frontend with supported Node (22 recommended). Do not copy `node_modules` between operating systems. |
| Application says it cannot reconnect | Start the API, verify `/api/v1/health`, and ensure frontend proxy target/port is correct. Browser calls must remain same-origin `/api/v1`. |
| Guides remain queued | Ensure exactly one normal app process has `WORKER_ENABLED=true`; inspect worker health/logs. A test configuration intentionally disables the worker. |
| Partial or interrupted guide | Read the actual error and coverage. Retry after fixing transient issues; valid initial compatible checkpoints are reused. Do not repeatedly retry a permanent authorization/config error. |
| Source/provider changed error | Start **Guide options → New guide from this source**. Existing material is kept; incompatible checkpoints/engines are not silently mixed. |
| Invalid AI output after repair | Confirm endpoint/model support JSON chat-completions parameters. Reduce chunk size for new guides, increase output budget carefully, or choose a more suitable model. No invalid result is saved as a success. |
| Local mode refuses language/instructions | This is intentional. It cannot translate or follow free-form teaching instructions; configure AI or use supported English/default options. |
| YouTube authorization/unavailable error | Check both exact allowlist and actual account caption rights, token mode/expiry, Google API project/scopes/quota, and returned language list. Public video visibility is not caption-download permission. Paste/upload remains usable. |
| Failed retrieval seems stuck | Actual task polling errors have a check-status/manual fallback. Switching composer methods stops watching that task; it does not cancel a provider call already sent. |
| File rejected | Only UTF-8 TXT/SRT/VTT within configured limits. Check extension, encoding, valid timestamp cue format, minimum useful content and the full source character limit. Binary/HTML/video files are not transcripts. |
| CSRF/session error | Refresh to bootstrap a valid session/token. Sign back in for account data. Losing a guest cookie loses access to that guest workspace; it is not an account-recovery mechanism. |
| Login does not persist | Match scheme/host/origin. Secure production cookies require HTTPS. Do not alternate localhost and 127.0.0.1 and expect identical browser cookies. |
| 409 edit conflict | Another edit/regeneration completed. Reload the saved guide; copy unsaved text before refreshing. Stale writes intentionally do not win. |
| 429 rate/quota limit | Wait for the relevant window, or have the operator review configured budget/edge limits. Behind an untrusted-header proxy, the app can see a shared peer IP. |
| Browser copy blocked | Use HTTPS or a trusted localhost context, grant clipboard permissions, or download an export. Browser privacy policy can block copying. |
| Print view does not open | Allow the user-triggered popup or open/download the print URL from the export control, then use browser Print. There is no backend PDF button pretending to generate a native PDF. |
| Production `/docs` not available | Intentional CSP choice: interactive CDN docs are disabled in production. Use `/openapi.json`, local development `/docs`, and `docs/API.md`. |
| E2E says ports in use | Tests require free 8001/5311 and refuse reusing a server. Stop a previous test/server, not your developer database. |
| Chromium missing libraries | From frontend run `npx playwright install --with-deps chromium`. Linux dependency installation can require administrative privileges. |
| E2E Python missing | Default expects root `.venv`; set `TW_PYTHON` to the correct executable if installed elsewhere. |
| Docker asks for PostgreSQL password | Generate/set a unique URL-safe `POSTGRES_PASSWORD` in root `.env`. Do not use empty/example secrets for production. |
| Docker database login fails after changing `.env` | An existing PostgreSQL volume keeps its role password. Perform a controlled database password rotation, not deletion of a valuable volume. |

Runtime dependency caches, installed packages, databases, secrets and generated builds are intentionally not shipped. Installation and migrations are required after extracting the source ZIP. Keep error reports sanitized; do not send raw transcripts, passwords, cookies, tokens, `.env`, exported private guides or provider response bodies to public issue trackers.
