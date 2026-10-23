# Verification record

Last updated: **2026-10-22**. This file distinguishes executed checks from checks made available but not executed in the current workspace.

## Executed in this workspace

| Check | Final result | Environment |
|---|---|---|
| Backend unit + API + migration + security + worker tests | **36 passed** | pytest 9.1.1, Python 3.11, PostgreSQL 18.6 via PGlite 0.5.11 |
| Alembic downgrade → re-upgrade → deterministic reseed | Passed | PGlite compatibility run |
| Direct isolation demonstration | Own-tenant rows allowed; cross-tenant SELECT hidden; INSERT SQLSTATE 42501; UPDATE/DELETE zero rows | Explicit `SET ROLE tenantcore_app` |
| Live Vite → FastAPI smoke | Login, dashboard, project create/delete, cross-tenant 404, forged-switch 403, usage increment, and parallel platform queries passed | Fresh four-client PGlite preview |
| Backend Ruff lint + format check | Passed | 64 Python files |
| Backend mypy | Passed; no issues in 50 source files | Python 3.11 |
| Python dependency audit | **No known third-party vulnerabilities** | pip-audit 2.10.1; local editable project is not a PyPI dependency |
| Frontend component tests | **5 passed** | Vitest 5, jsdom |
| Frontend TypeScript | Passed | TypeScript strict/no-unused checks |
| Frontend ESLint | Passed with no warnings | Flat ESLint config |
| Frontend production build | Passed; route-level code splitting | Vite 8 |
| Frontend dependency audit | **0 vulnerabilities** | npm audit, 2026-10-22 registry data |

PGlite's socket server ignores startup usernames and emulates client connections over shared state. For local verification only, `DATABASE_ROLE=tenantcore_app` / `TEST_DATABASE_ROLE=tenantcore_app` make every app connection explicitly `SET ROLE tenantcore_app`; migration/control connections reset to the migration user. Direct tests also set the role. This avoids falsely testing as `postgres`. The compatibility path is not needed for official PostgreSQL credentials.

The serialized PGlite runner occasionally closes an emulated client during establishment. Direct tests retry **connection establishment only**, never a SQL assertion or partially executed test. The preview uses a fresh four-client instance. Neither compatibility setting relaxes an RLS policy or an expected status/assertion.

The final direct script produced:

```text
ALLOWED Acme -> Acme SELECT: 2 projects, all tenant-bound
DENIED  Acme -> Globex SELECT: row hidden by RLS
DENIED  Acme -> Globex INSERT: 42501 RLS WITH CHECK
DENIED  Acme -> Globex UPDATE: 0 rows affected
DENIED  Acme -> Globex DELETE: 0 rows affected
Isolation demonstration passed with the tenantcore_app database role.
```

## Reproducible checks requiring external services

The repository includes PostgreSQL 16 Compose services and a GitHub Actions workflow for clean migration, full tests, migration downgrade/re-upgrade, mypy/Ruff/audits, frontend checks, and Playwright. These are the authoritative production-reference checks.

**Not executed in this sandbox:**

- Official PostgreSQL 16 Docker Compose test run and container image builds (Docker and `psql` are not installed).
- Browser Playwright execution (no Chromium browser is installed). The E2E specs and CI setup are included, but are not claimed as passed here.
- A live Redis broker or Celery worker process. Worker functions are tested with real tenant-scoped database transactions; broker delivery/retry behavior and Redis-backed rate limiting still require the Compose/CI environment. The preview reports Redis as unavailable and uses development fail-open login throttling.
- The GitHub Actions workflow itself; it is supplied for the connected repository but was not represented as an executed CI run.

A skipped browser/PostgreSQL check is not represented as a passing security claim. Run the commands in the root README or the included CI workflow before a production release.

## Adversarial coverage included

- Tenant A → A allowed, A → B denied, B → A denied.
- Direct SELECT/INSERT/UPDATE/DELETE under the actual unprivileged runtime role.
- Cross-tenant composite foreign-key attempt.
- Malicious tenant header/query/body values and unknown tenant context.
- Platform-admin allow/deny, normal-member admin denial, read-only role/API-key scope.
- Suspended, archived, and provisioning lifecycle behavior.
- Refresh rotation/replay and logout revocation.
- One-time invitation acceptance and replay denial.
- API-key expiry/revocation logic, scope, tenant selection, and post-revocation denial.
- Background report/aggregation tenant confusion.
- Audit mutation privilege/policy protection.
- Clean migration object/policy/index/constraint verification.
