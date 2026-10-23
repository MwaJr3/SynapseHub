# Production-style deployment and operations

This is a deployment guide, not a claim that the local Compose file is a complete production platform. Use managed/separately backed PostgreSQL and Redis, TLS, a secrets manager, multiple application instances, and monitored backup/restore procedures.

## 1. Environment and secrets

Set at minimum:

```text
ENVIRONMENT=production
DEMO_MODE=false
DATABASE_URL=postgresql+psycopg://tenantcore_app:<secret>@<private-host>/tenantcore
MIGRATION_DATABASE_URL=postgresql+psycopg://<migration-role>:<secret>@<private-host>/tenantcore
REDIS_URL=rediss://:<secret>@<private-redis>/0
JWT_SECRET=<random secret of at least 32 bytes>
CORS_ORIGINS=https://app.example.com
RATE_LIMIT_FAIL_OPEN=false
```

Inject values using your platform's secret manager; do not bake them into images or commit `.env`. Restrict migration credentials to deployment jobs. URL-encode special password characters. Use TLS parameters required by your providers and verify certificates.

The app validates production demo/secret settings at startup. Keep API and migration roles separate. Initialize `tenantcore_app` once using the provided role script as a reference, then rotate passwords through your platform process.

## 2. Build and deploy

Images:

- `infrastructure/docker/backend.Dockerfile`: non-root Python runtime for API, migrations, and worker commands.
- `infrastructure/docker/frontend.Dockerfile`: compiled static assets behind Nginx with API proxying.
- Local `docker-compose.yml`: development orchestration only.

Deploy in this order:

1. Run database backup/preflight and confirm role/network connectivity.
2. Run `alembic upgrade head` as a separate one-shot migration job.
3. Verify migration version and smoke checks.
4. Roll out API instances, then workers. Run one scheduler (Celery beat) per environment; do not use development's combined worker `--beat` in production.
5. Deploy frontend assets/API gateway and run health + tenant-isolation smoke tests.
6. Continue rollout only after checks pass. Do not run seed data in production.

## 3. Migration failure strategy

The initial migration is transactional on PostgreSQL and requires the runtime role to exist before DDL. Later migrations should use expand/contract:

- Add nullable/new structures first; deploy compatible code; backfill in bounded batches; enforce/drop old structures after old code is gone.
- Avoid long table rewrites and unbounded locks during fleet traffic.
- Record a revision-specific rollback/roll-forward plan. Do not automatically `downgrade` a production database after a failed deploy; destructive downgrades can lose data.
- A multi-step data migration needs checkpointing/idempotency and is not rescued by transactional DDL alone.
- For schema-per-tenant, migrate bounded cohorts and record each schema version independently.

Clean-database upgrade, downgrade/re-upgrade in disposable environments, and runtime-role RLS tests are release gates.

## 4. PostgreSQL configuration and pooling

Start conservatively and tune from measurements:

- Keep API transactions short; pool pre-ping is enabled and pool recycling is 30 minutes.
- Default app pool is 10 + 20 overflow per process. Multiply across every API/worker replica and stay below the database's safe connection budget.
- Prefer a managed pooler for larger fleets. With transaction pooling, every context set and statement must remain in one transaction, exactly as implemented. Do not move tenant context to session-level `SET`.
- Server-side prepared statements are disabled in the psycopg connection for transaction-pool/PGlite compatibility. Parameterization remains intact. Reassess only with your pooler's prepared-statement support.
- Set statement/lock/idle-in-transaction timeouts at the role/pooler layer appropriate to workloads.
- Monitor autovacuum, dead tuples, long transactions, replication lag, lock waits, and pool saturation.

No partitioning, sharding, or read replicas are required initially. Add them from observed scale and query requirements, not as decoration.

## 5. HTTPS and gateway

Terminate HTTPS at a trusted load balancer/Ingress and redirect HTTP. Configure HSTS after verifying all subdomains, narrow CORS to the deployed frontend, and forward only sanitized proxy headers. If client IP rate limiting is used, trust `X-Forwarded-For` only from known proxies; the demo uses the immediate peer.

Nginx serves the compiled SPA and proxies `/api/` and `/health/` to FastAPI. Do not publicly proxy `/metrics`; scrape it inside the monitoring network or protect it with monitoring credentials/network policy. Production FastAPI disables interactive docs by default.

## 6. Redis and workers

Redis provides login throttling and Celery broker/results. Use authenticated TLS Redis with persistence/high availability appropriate to the workload. Development fail-open rate limiting must be disabled in production.

Run worker and scheduler separately with bounded concurrency. Monitor queue depth, retries, result failures, and per-tenant execution time. Every job payload must carry tenant UUID explicitly; never infer it from a process-global variable. Add a durable outbox/idempotency store before jobs charge money, send real email, or perform non-repeatable external effects.

## 7. Logging, metrics, and alerts

Collect stdout JSON logs centrally and retain request IDs with API/gateway logs. Do not log Authorization, API-key, invitation, password, or refresh-token values.

Scrape `/metrics` internally. Useful initial alerts:

- readiness failing or database connection errors;
- elevated 5xx/429 rates and p95/p99 latency;
- pool wait/connection saturation;
- worker failure/retry and queue backlog;
- spikes in tenant-access-denied events;
- backup/PITR failure and replica/vacuum lag.

Metrics use route templates to avoid unbounded resource-ID label cardinality. Add tracing only with a real collector/backend and sampling/data-retention plan.

## 8. Backups and disaster recovery

Use encrypted automated physical/base backups plus WAL archiving for PostgreSQL PITR. Define RPO/RTO with the business; examples such as “RPO ≤ 5 minutes” are targets only after measured validation. Replicate backups to a separate failure domain with restricted credentials and retention/legal-hold policies.

Logical `pg_dump` can supplement releases/tenant exports but does not replace PITR. Back up control-plane and tenant data consistently. Include roles/privileges/functions/extensions in recovery documentation; a data-only dump may omit them.

### Restore drill

1. Provision an isolated PostgreSQL target with compatible version/extensions.
2. Restore base backup and replay WAL to a verified target time.
3. Recreate/verify runtime and migration roles, grants, RLS, and secrets references.
4. Run Alembic version checks—do not blindly migrate recovered data before understanding the target version.
5. Verify tenant counts, constraints, audit continuity, and direct RLS smoke tests.
6. Start a controlled application instance and test login, own-tenant access, and cross-tenant denial.
7. Document actual RPO/RTO and cut over only through the approved DNS/registry/process.

Test schema-level tenant restore separately if using the alternative architecture; public registry and global identity rows still need handling.

## 9. Health and graceful failure

- Liveness reports only process health; readiness checks PostgreSQL. Orchestrators should not route to an unready instance.
- Database exceptions roll back the request transaction and return a generic error with request ID; the app never converts a failed commit into success.
- Successful tenant operations and their API usage increment share one transaction; failed requests are not metered. This avoids a second connection during dependency teardown. Billable/event metering for asynchronous external effects would still require an outbox design.
- Archive rather than hard-delete tenants. Physical deletion requires a separate approved retention/backup workflow.

## 10. Release checklist

- Official PostgreSQL version migration and RLS suites pass.
- Frontend typecheck/lint/component/build and critical Playwright workflows pass.
- Dependency audit and secret scan reviewed.
- Production configuration validates; demo data disabled.
- Backup and rollback/roll-forward plan recorded.
- Pool/replica/scheduler counts fit connection and queue budgets.
- HTTPS/CORS/metrics/log access controls verified.
- Restore drill and isolation smoke test evidence are current.
