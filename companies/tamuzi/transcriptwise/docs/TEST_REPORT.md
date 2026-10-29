# Verification report

**Handoff build: 23 October 2026.** These are executed results, not a production-readiness certification. External credentialed services were mocked where stated. No line/branch coverage percentage was collected.

## Environment and results

Linux; CPython 3.13.16; Node.js 20.20.2; SQLite 3.46.1; PostgreSQL 17.11; Playwright 1.64.1 / bundled Chromium. Runtime and development Python packages were installed from the hashed release locks, and frontend dependencies with `npm ci`.

| Check | Executed result |
|---|---|
| Backend pytest, SQLite | **69 passed** |
| Same backend suite, real PostgreSQL | **69 passed** against a disposable `_test` database |
| Frontend component/workflow tests, Vitest | **19 passed** |
| Real API/worker/database Chromium workflows | **12 passed**, six on desktop and six on mobile; zero retries |
| Backend Ruff lint and format | Passed |
| Frontend Prettier check | Passed |
| TypeScript application and E2E type checks | Passed |
| Vite production build | Passed, including lazy routes and locally bundled fonts |
| Alembic on SQLite and PostgreSQL | Upgrade → downgrade → upgrade passed; no schema-drift operations detected |
| Python runtime audit | **0 known vulnerabilities**, 32 locked packages |
| Python development-lock audit | **0 known vulnerabilities**, 39 locked packages |
| npm audit, including development dependencies | **0 known vulnerabilities** |
| Compose / CI YAML and entrypoint shell | Parsed successfully; `sh -n` passed; not container/hosted execution |
| Local development launcher | Migrations, API, frontend and proxied health passed; SIGTERM stopped both and both ports closed |
| Authored TXT, SRT and VTT fixtures | Each parsed successfully into three source segments |

The final combined command exited successfully:

```bash
TW_CAPTURE_SCREENSHOTS=1 .venv/bin/python scripts/test.py --e2e
```

That command runs SQLite backend tests, backend lint/format, frontend format/tests/typecheck/build, then real browser workflows. PostgreSQL and audit checks were run separately, including after the certificate-bundle dependency update.

## Behavior covered

### Backend tests

- Plain-text, timestamped, SRT and WebVTT parsing; malformed/empty/unsupported input; source segment IDs, timing and chunk coverage.
- A near-limit (~283,000-character) transcript goes through analysis without losing its final source segment; JSON export retains the original and all initial raw chunk results.
- Guide validation, actual quotation matching, known/adjacent source references, meaningful required sections, local-mode limits, deduplication and explicit bounded-output selection that retains coverage of the tail.
- Deterministic compatible-AI HTTP responses/errors and bounded repair; authorized YouTube metadata/caption contract, permissions/allowlist and failure handling. No external paid/live account was used.
- Initial checkpoints, immutable source/provider plans, retry, interrupted-task recovery, partial results, section regeneration and conflict protection. Partial generated sections cannot be manually changed before initial completion; saved personal notes survive continuation.
- Guest-to-account conversion/adoption, password verification, session rotation/revocation, CSRF/origin/ownership isolation, stale revisions, validation redaction and bounded rate-limiter behavior.
- Persistent library/search/organization, editable notes and user-edited provenance; quiz scoring versus open-answer self-assessment; flashcard history, due dates and bounded review intervals.
- Markdown, DOCX, JSON and escaped print output; deletion of guides/accounts and associated source/study records; retention/purge behavior and worker/configuration checks.

Tests are assertions of the included cases, not proof of every possible malicious input or timing interleaving. DOCX packaging/content was validated; no desktop Microsoft Word UI was executed.

### Browser workflows

Both viewport configurations run all six workflows against the actual FastAPI backend and local extractive engine, using an isolated migrated SQLite database:

1. Paste → edit source → choose guide options → generate → follow source reference → quiz → flashcard → save/reload personal notes → section edit/regeneration.
2. Register → save → folders/tags/search → sign out/sign in → copy/export/print → guide deletion → wrong-password account-deletion refusal → successful account deletion → fresh guest workspace.
3. Upload and parse actual subtitle files with their real timestamps.
4. An explicitly mocked unavailable YouTube response preserves manual paste/upload fallbacks and never substitutes the example transcript.
5. Light/dark/system theme controls, mobile navigation, library/settings/help/about and horizontal-overflow checks.
6. Keyboard skip-link/focus checks and axe accessibility scans of selected home/review/guide states.

Desktop: **1440 × 1000**. Mobile: **390 × 844**, Chromium using the Pixel 7 device profile. These are responsive browser emulations, not physical-device, Safari or Firefox tests.

Print-view text and print invocation were tested; operating-system print dialogs and a downloaded native PDF were not. The application intentionally supplies a browser print view, not a server PDF generator.

### Accessibility and screenshots

Selected light/dark home and guide states and the review state were checked with axe using WCAG 2 A/AA and WCAG 2.1 AA tags, on both browser profiles: **zero reported violations in the scanned states**. Keyboard tests and visual inspection supplement these checks. This is not a comprehensive accessibility audit or conformance certification.

Eight screenshots are included under `docs/screenshots/`: workspace and guide, light and dark, desktop and mobile. They contain guest/authored-example content, not fetched-video claims or private account data. Capture resets focus/scroll so an accidentally focused skip link is not retained in the images.

## Audits and nonfatal warnings

The refreshed Python audit identified PYSEC-2026-4320 in the earlier `certifi` bundle. The runtime input now requires `certifi>=2026.10.19`; both hashed locks resolve **2026.10.23**. Dependencies were reinstalled, checked with `pip check`, and backend tests rerun on both databases. The final complete browser/build suite also passed with that installation.

Audit snapshots: `python-audit.json`, `python-dev-audit.json`, and `npm-audit.json`. Known-advisory databases change, and these checks do not inspect every application flaw or container/system dependency.

Nonfatal observed warnings: Starlette's TestClient warns that its HTTPX compatibility path is deprecated; the Vite/Rollup build removes two misplaced purity annotations in Zod dependency comments. Neither prevented the tests/build. They are not represented as runtime failures or silently suppressed.

## Archive and reproducibility

The packaging helper includes source, migrations, hashed locks, examples, deployment/CI recipes, documentation, OpenAPI and screenshots. It excludes the actual `.env`, private databases, dependencies, caches, build output, browser traces/downloads/results and runtime logs. Runtime data is created after installation, not shipped in the archive.

`MANIFEST.sha256` inside the archive hashes each shipped source/document/asset. Release packaging is checked with ZIP CRC integrity, per-file SHA256 verification, required-file/exclusion checks, and two identical-source builds producing identical archive hashes. Install dependencies with the lockfiles; the ZIP is not a bundled/offline Python or Node runtime.

## Explicitly not verified

- Live paid AI inference or real Google/OAuth caption retrieval. Supply server credentials, exact sharing allowlist and perform authorized live smoke tests.
- An actual Docker image build/run, real TLS ingress, public production deployment or hosted GitHub Actions run. YAML/shell checks do not establish these.
- Windows/macOS execution, Safari/Firefox/physical devices, comprehensive assistive-technology testing, an independent penetration test, load/fault-injection certification or a backup-restore drill.
- Semantic truth of source claims/model output, learning effectiveness or mastery prediction. Sources remain attributed and unverified.

## Remaining product/operations work

Email verification, password recovery, MFA, per-user Google consent, sharing/collaboration and a full guide revision history are not implemented. The worker/rate limiter deliberately require **one process/instance**. Add distributed coordination only if scaling requires it. Before broad public use, validate live integrations, complete security/accessibility review, verify container/TLS deployment, configure and restore-test backups, and establish monitoring/cost controls. See `LIMITATIONS.md`, `DEPLOYMENT.md` and `SECURITY_PRIVACY.md`.
