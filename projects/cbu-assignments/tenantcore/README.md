# TenantCore

**Isolation by design: a functional multi-tenant SaaS backend whose final tenant boundary is enforced by PostgreSQL Row-Level Security.**

TenantCore answers a deceptively difficult business question: **how can one SaaS platform serve thousands of organizations without allowing one customer to read, change, or infer another customer’s data?**

It is not a static architecture demo. It includes a FastAPI control plane, versioned REST API, React administration dashboard, Alembic migrations, restricted PostgreSQL runtime role, explicit memberships and roles, rotating sessions, API-key authentication, tenant-aware Celery jobs, immutable audit records, usage metering, deterministic demo organizations, and adversarial tests.

## The engineering challenge

Multi-tenancy is more than adding `tenant_id` to a table. A production design must coordinate:

- **Authentication:** who is making the request?
- **Authorization:** what may this identity do in this organization?
- **Membership:** does the identity actively belong to the selected organization?
- **Isolation:** which rows will PostgreSQL permit even if application authorization has a bug?
- **Operations:** how are tenants provisioned, suspended, migrated, measured, audited, backed up, and eventually moved to dedicated infrastructure?

The primary implementation uses **shared database + shared schema + PostgreSQL RLS**. A separately documented and executable **schema-per-tenant reference** demonstrates the alternative without claiming either model is universally superior.

## What is implemented

| Area | Functional implementation |
|---|---|
| Tenant lifecycle | Provision, activate, suspend, and terminal archive; protected resources reject non-active tenants |
| Identity | Argon2 password hashing, 15-minute JWTs, persisted sessions, rotating refresh tokens, logout revocation |
| Membership | Explicit tenant/user membership, invitations, tenant-specific roles, deactivation, last-admin/self-lockout guards |
| Tenant data | Teams, projects, tasks, documents, comments, notifications, subscriptions, usage metrics, API keys, audit events |
| Database isolation | `ENABLE` and `FORCE ROW LEVEL SECURITY`; SELECT/INSERT/UPDATE/DELETE policies; active-tenant guard |
| Relationship safety | Composite keys such as `(tenant_id, project_id)` prevent cross-tenant foreign keys |
| API credentials | One-time secrets, SHA-256 hashes, expiry, scopes, revocation, and working `X-API-Key` authentication |
| Background work | Explicit tenant arguments, idempotent usage aggregation, report isolation tests, Redis/Celery |
| Observability | JSON logs with request IDs, Prometheus metrics, readiness/liveness, Redis login rate limiting |
| Dashboard | Platform and tenant views, real CRUD, search/filter/sort/pagination, settings, lifecycle confirmations, isolation lab |
| Verification | Unit, API, migration, direct-database RLS, worker, component, and Playwright tests |

## Quick start: Docker Compose

Requirements: Docker with Compose v2. No real secrets are included; passwords in `.env.example` are explicitly local demo values.

```bash
cd tenantcore
cp .env.example .env
docker compose up --build
```

Compose starts PostgreSQL 16, Redis, a one-shot migration/seed job, FastAPI, a Celery worker/beat process, and Vite.

- Dashboard: **http://localhost:5173**
- OpenAPI: **http://localhost:8000/docs**
- Readiness: **http://localhost:8000/health/ready**
- Prometheus metrics: **http://localhost:8000/metrics** (restrict this endpoint to the monitoring network in production)

### Fictional demo identities

All companies, people, and records are labeled demonstration data.

| Identity | Email | Password | Access |
|---|---|---|---|
| Acme admin | `acme.admin@tenantcore.demo` | `DemoPass!2026` | Acme tenant administrator |
| Acme member | `acme.member@tenantcore.demo` | `DemoPass!2026` | Acme member |
| Globex admin | `globex.admin@tenantcore.demo` | `DemoPass!2026` | Globex tenant administrator |
| NovaTech admin | `novatech.admin@tenantcore.demo` | `DemoPass!2026` | NovaTech tenant administrator |
| Multi-org user | `multi@tenantcore.demo` | `DemoPass!2026` | Manager in Acme, read-only in Globex |
| Platform admin | `platform.admin@tenantcore.demo` | `PlatformAdmin!2026` | Platform control plane |

Never enable `DEMO_MODE` or reuse these credentials in production. Production settings reject demo mode and development secrets.

## Reproduce the security demonstration

After Compose is running:

```bash
cd tenantcore
set -a; source .env; set +a
cd scripts
python demo_isolation.py
```

Expected evidence (exact project count can increase as you use the dashboard):

```text
ALLOWED Acme -> Acme SELECT: 2+ projects, all tenant-bound
DENIED  Acme -> Globex SELECT: row hidden by RLS
DENIED  Acme -> Globex INSERT: 42501 RLS WITH CHECK
DENIED  Acme -> Globex UPDATE: 0 rows affected
DENIED  Acme -> Globex DELETE: 0 rows affected
```

The script connects as **`tenantcore_app`**, not the migration/superuser role. The dashboard’s **Isolation lab** also runs real HTTP checks for own-tenant access, a cross-tenant resource ID, and a forged `X-Tenant-ID`.

## Architecture

```mermaid
flowchart TB
  UI[React + TypeScript dashboard] -->|HTTPS, relative /api/v1 calls| API[FastAPI]
  API --> AUTH[Authentication<br/>JWT/session or API key]
  AUTH --> AUTHZ[Membership + role + scope authorization]
  AUTHZ --> CTX[Controlled transaction<br/>transaction-local tenant context]
  CTX --> PG[(PostgreSQL 16)]
  PG --> RLS[RLS USING / WITH CHECK]
  RLS --> ROWS[Only authorized tenant-owned rows]
  API --> REDIS[(Redis<br/>rate limits + Celery broker)]
  WORKER[Celery worker<br/>explicit tenant_id argument] --> CTX
  API --> LOG[JSON logs + Prometheus metrics]
```

```mermaid
sequenceDiagram
  participant C as Client
  participant A as FastAPI
  participant D as PostgreSQL
  C->>A: Request + credential + optional X-Tenant-ID
  A->>D: Validate access session or API credential
  A->>D: Verify active membership and tenant status
  A->>D: BEGIN; set_config(..., true) for user/tenant/request
  A->>D: Parameterized tenant operation
  D->>D: RLS USING + WITH CHECK and composite FKs
  D-->>A: Visible rows / write result
  A->>D: COMMIT mutation + audit event atomically
  A-->>C: Consistent response; no cross-tenant existence details
```

See [architecture](docs/architecture.md), [RLS enforcement](docs/rls.md), [multi-tenancy comparison](docs/multi-tenancy.md), and [schema-per-tenant operations](docs/schema-per-tenant.md).

## Database design decisions

- **PostgreSQL** provides transactional DDL, mature RLS, composite foreign keys, partial indexes, JSONB, and reliable UTC `timestamptz` handling.
- **RLS is primary** because it offers strong shared-infrastructure isolation with lower operational overhead than thousands of schemas.
- **SQLAlchemy 2.x** supplies typed models and parameterized statements, but is deliberately not the isolation boundary.
- **Alembic** versions schema, constraints, functions, grants, and policies together; the app never runs `create_all` at startup.
- **UUIDv4** IDs are generated by Python or `gen_random_uuid()`. They avoid cross-tenant sequential-ID enumeration and work across app/worker instances. Deterministic demo fixtures use UUIDv5 solely for reproducible isolation targets. UUIDv7 is a future index-locality optimization, not a security feature.
- **UTC everywhere:** timestamps are `timestamptz`; usage periods are UTC dates.
- **Indexes follow query shapes:** `(tenant_id, created_at)`, `(tenant_id, status)`, `(tenant_id, project_id, status)`, and selective partial indexes for open tasks/unread notifications. Not every column is indexed.
- **No premature partitioning/sharding.** Measure query plans, vacuum behavior, table sizes, and tenant skew first.

## API outline

All application resources are under `/api/v1`.

```text
/auth/login /auth/refresh /auth/logout /auth/me /auth/accept-invitation
/tenants /platform/dashboard /plans /organization
/members /projects /teams /tasks /documents /notifications
/audit-events /usage /api-keys /dashboard
```

Use `Authorization: Bearer <access-token>` or `X-API-Key: <one-time-secret>`. Tenant requests use `X-Tenant-ID`; the server treats it only as a **request to select a tenant**, then verifies membership and status. Request-body `tenant_id` never establishes authority. A read-scoped API key cannot mutate, and no API key can access account-session endpoints.

Errors share one shape and include a request ID without leaking SQL errors:

```json
{
  "error": { "code": "TENANT_ACCESS_DENIED", "message": "Organization access was denied", "details": null },
  "request_id": "..."
}
```

## Run the quality gate

### Unit and frontend checks

```bash
cd tenantcore/backend
python -m venv .venv
.venv/bin/pip install --upgrade pip setuptools
.venv/bin/pip install -e '.[dev]'
.venv/bin/pytest -q tests/unit
.venv/bin/ruff check app migrations tests ../scripts
.venv/bin/ruff format --check app migrations tests ../scripts
.venv/bin/mypy app
.venv/bin/pip-audit

cd ../frontend
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm audit --audit-level=moderate
```

### Official PostgreSQL 16 integration and RLS suite

Start the disposable test services, then opt into a destructive reset of **only** `tenantcore_test`:

```bash
cd tenantcore
docker compose -f docker-compose.test.yml up -d --wait
cd backend
export RUN_POSTGRES_TESTS=1
export TEST_DATABASE_URL='postgresql+psycopg://tenantcore_app:tenantcore_app_test_dev@localhost:5433/tenantcore_test'
export TEST_MIGRATION_DATABASE_URL='postgresql+psycopg://tenantcore:tenantcore_test_dev@localhost:5433/tenantcore_test'
export TEST_REDIS_URL='redis://localhost:6380/0'
export TENANTCORE_TEST_ALLOW_RESET=YES
.venv/bin/pytest -q
.venv/bin/alembic downgrade base
.venv/bin/alembic upgrade head
cd ..
docker compose -f docker-compose.test.yml down -v
```

Tests marked `postgres` **skip explicitly** when PostgreSQL is not configured. A skipped RLS test is never reported as a passing security proof. The suite includes malicious headers/body/query values, both cross-tenant directions, direct runtime-role writes, unknown/suspended contexts, role escalation, API-key scope/revocation, and background-job tenant confusion.

### Browser workflows

With the demo stack running:

```bash
cd tenantcore/frontend
npx playwright install chromium
npm run test:e2e
```

Playwright covers sign-in, real project creation, and actual isolation-lab HTTP 404/403 results.

## Project structure

```text
tenantcore/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # Versioned resource controllers
│   │   ├── auth/             # Identity, sessions, membership/context dependencies
│   │   ├── database/         # Engine, session factory, transaction-local context
│   │   ├── models/           # Platform and tenant-owned SQLAlchemy models
│   │   ├── tenants/          # Tenant schemas + alternative schema strategy
│   │   ├── demo/             # Deterministic fictional seed data
│   │   ├── services/         # Usage and rate limiting
│   │   ├── middleware/       # Logs, metrics, request IDs, metering
│   │   └── worker.py         # Celery jobs with explicit tenant IDs
│   ├── migrations/           # Alembic schema + RLS + grants + triggers
│   └── tests/{unit,integration,security}/
├── frontend/src/{components,pages,features,services,types}/
├── infrastructure/docker/    # Dockerfiles, Nginx, runtime role initialization
├── docs/                     # Architecture, security, operations, comparison
├── scripts/demo_isolation.py
├── docker-compose.yml
├── docker-compose.test.yml
└── .env.example
```

## Scaling and hybrid tenancy

Expected evolution, driven by measurements rather than tenant count alone:

```text
Shared PostgreSQL + RLS
  → query/index/vacuum optimization and bounded pools
  → justified partitioning for very large tenant-owned tables
  → read replicas for suitable read workloads
  → dedicated database for exceptional size, regulation, or noisy-neighbor risk
  → regional cells / distributed control plane
```

A hybrid model keeps most tenants on shared RLS while a registry routes selected large tenants to dedicated databases. Migration requires an export, consistency check, cutover/fencing step, restore validation, and rollback plan; it is not a runtime `search_path` toggle.

## Reliability and operational posture

- One controlled transaction per operation; exceptions roll back and never produce a success response.
- Audit event and domain mutation commit atomically; audit UPDATE/DELETE privileges are revoked and triggers reject mutation.
- Task versions prevent lost updates; usage aggregation is idempotent; transient worker DB errors use bounded backoff.
- Pool pre-ping, bounded pools/timeouts, readiness checks, graceful client DB errors, and structured failure logs are enabled.
- Production deployment covers migration jobs, PgBouncer/transaction-local context, HTTPS, backups, PITR, and restore drills in [deployment.md](docs/deployment.md).

## Known limitations and honest trust boundaries

- The **RLS implementation is primary**. Schema-per-tenant is a documented executable reference, not a second runtime selectable per request.
- PostgreSQL custom settings are not secret capabilities. They are set only by trusted backend/worker code after membership checks. RLS is defense against missing filters and many application bugs; it is **not** a guarantee against arbitrary SQL execution by a compromised application DB role. Never issue that role to end users. See [security.md](docs/security.md).
- Platform control tables (`users`, `plans`, auth sessions) are global rather than tenant-owned. Tenant-owned tables, memberships, tenant configuration, and tenant audit data use RLS.
- Invitations are returned once to an authorized administrator for trusted-channel delivery; no email provider is simulated. Documents are stored in PostgreSQL, not an external object store. Billing is intentionally decoupled and not implemented.
- Browser tokens live in `sessionStorage` for this portfolio demo. A high-assurance deployment should use a BFF or Secure/HttpOnly/SameSite refresh cookie with CSRF protection and a strict CSP.
- No OpenTelemetry collector, Grafana, read replicas, sharding, or partitioning is added for appearance. Structured logs and Prometheus metrics cover the current observability need.
- Archival is terminal and preserves data. Physical tenant destruction and cross-architecture online tenant migration require a separate audited runbook.
- PGlite can supplement local checks, but **official PostgreSQL 16 is the required production verification target**. See [verification.md](docs/verification.md) for environment-specific results and unexecuted checks.

## Documentation index

- [System and data architecture](docs/architecture.md)
- [Multi-tenancy strategies and scaling](docs/multi-tenancy.md)
- [PostgreSQL RLS deep dive](docs/rls.md)
- [Schema-per-tenant lifecycle and trade-offs](docs/schema-per-tenant.md)
- [Security threat model](docs/security.md)
- [Production deployment, backup, and recovery](docs/deployment.md)
- [Verification and known environment limits](docs/verification.md)
