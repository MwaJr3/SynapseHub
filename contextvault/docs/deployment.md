# Deployment

## Local demo

Run `npm install && npm run dev` in `contextvault/`. Embedded PGlite is a single-process development convenience, not a multi-instance server database. Do not start the standalone worker against the same PGlite directory. `.data/` contains the local database and binary objects; it is not committed. Stop the server before using the local seed/evaluation/grant CLI against that directory.

## Docker Compose

The Compose stack uses PostgreSQL 16 with pgvector 0.8.1, RustFS 1.0.0 for S3-compatible storage, a one-time bucket setup and migration job, a Next.js app, and a separate ingestion worker. The previously referenced `minio/minio` and `minio/mc` Docker Hub images no longer pull; RustFS is a different S3-compatible server, not a drop-in on-disk migration of existing MinIO volumes. It requires Docker with Compose v2. The runtime image prunes development dependencies; `tsx` remains a production dependency for the TypeScript migration and worker entrypoints.

```bash
cd contextvault
cp .env.compose.example .env
# Edit .env: fill in all four secrets with strong, unique values.
# The PostgreSQL passwords must be URL-safe alphanumeric/hex; they are inserted into connection URLs.
docker compose up --build -d --wait
docker compose ps
# Open http://localhost:3000 and register an account. The shared demo is disabled.
docker compose logs -f app worker
```

The app is published only on `127.0.0.1:3000` by default; PostgreSQL and RustFS are not published to the host. `APP_PORT` and `APP_BIND_ADDRESS` can change the binding. Use a TLS-terminating reverse proxy and appropriate network controls before allowing remote access; production session cookies require HTTPS (browsers may make a localhost exception). Mock AI is the default and makes no paid calls.

On a fresh database volume, `scripts/init-postgres.sh` creates `contextvault_app` as `NOSUPERUSER NOBYPASSRLS`, grants table privileges through migration-owner default privileges, and keeps table ownership separate. The official PostgreSQL image's initialization user `cvmigrate` is a **superuser**; the migration job uses it to install the extension, schema, HNSW/GIN indexes and RLS policies. The app and worker receive only the runtime database credential and set user context for each tenant transaction. Protect the migration credential and do not use it in the app. Initialization scripts run only on a fresh PostgreSQL volume; editing `.env` does **not** rotate existing role passwords.

This Compose setup is a starting point, **not a hardened production installation**. In particular, its app and worker use the RustFS root credentials to keep the example self-contained. For real deployments provision a separate bucket-scoped identity limited to the required object operations, restrict network access, use encrypted transport and managed secrets, and follow the operations and security guidance below. For a local OpenAI-compatible provider, `host.docker.internal` is mapped to the Docker host on Linux; the provider must accept connections from containers. `LOCAL_AI_API_KEY` and model settings are passed to both app and worker.

`GET /api/health/live` is a dependency-free liveness check. `GET /api/health/ready` returns 200 only when PostgreSQL and the core schema/pgvector extension are available, otherwise a generic 503. The Compose app healthcheck uses readiness. **Readiness does not check RustFS, worker progress, or AI-provider availability**; monitor those separately. Idle database disconnects are handled by the connection pool, and the worker polls again after an outage.

Data persists in the `postgres_data` and `object_data` volumes. `docker compose down` stops and removes containers but retains those volumes. **`docker compose down --volumes` permanently deletes the database and stored objects**; use it only for disposable stacks. Back up and restore both together.

### Test a disposable Compose stack

The CI workflow `.github/workflows/contextvault.yml` builds the stack and exercises a real PDF upload, separate worker, RustFS, citations, cross-user authorization, pgvector/HNSW, and RLS with the actual runtime role. It stops/restarts PostgreSQL, checks readiness and recovery without restarting the app or worker, then restarts services and checks persistence and object-deletion outbox processing.

To run the smoke test manually on a **disposable** stack (it creates and deletes test accounts and objects, and must never target production):

```bash
docker compose exec -T -e STACK_TEST_ALLOW_MUTATION=1 app node tests/stack/smoke.mjs create
# Optionally restart app, worker and object-storage here, and wait until healthy.
docker compose exec -T -e STACK_TEST_ALLOW_MUTATION=1 app node tests/stack/smoke.mjs verify
```

The test stores disposable identifiers in `/tmp/contextvault-stack-smoke.json` inside the app container between phases. The `recover` phase used by CI uploads and deletes an additional file after a temporary database outage. See the workflow for the full outage sequence and cleanup.

## Existing PostgreSQL

1. Install the pgvector extension compatible with the PostgreSQL version. Use TLS, managed backups and a private network.
2. Create the database, a migration owner allowed to install `vector`, and a separate runtime role with `NOSUPERUSER NOBYPASSRLS`. Grant the runtime role `CONNECT`, schema `USAGE`, and the necessary DML permissions on application tables. Configure default privileges for future migrations.
3. Apply `lib/db/schema.sql` with the migration principal, e.g. `DATABASE_URL="$DATABASE_MIGRATION_URL" npm run db:migrate`. Never give the application a superuser/BYPASSRLS connection.
4. Configure private S3-compatible storage, `DATABASE_URL` for the runtime principal, and explicit AI providers. Start `npm run start` after `npm run build`, and separately start `npm run worker` with the same runtime/database and storage configuration.
5. Verify RLS with the actual runtime role: setting user A's transaction-local `app.user_id` must not return user B's rows even when a query omits an owner predicate. The app still enforces explicit authorization independently.
6. Register an account. Only a trusted operator should grant developer access: `npm run grant:developer -- user@example.com` using a database principal permitted to update `users`.

For serverless hosting, use managed PostgreSQL with transaction-safe pooling, private object storage, and an independently deployed persistent worker. PGlite/in-process timers do not provide reliable serverless background processing. Check hosting request-body limits: some platforms reject uploads well below the app's 10 MiB cap. Direct-to-object-storage uploads and antivirus scanning are not implemented. Never use `localhost` in browser-facing API URLs; the app uses relative `/api/...` paths.

## Provider configuration and privacy

Default mock providers make no paid calls and do not provide semantic embeddings. To use OpenAI, explicitly set `AI_PROVIDER=openai`, `EMBEDDING_PROVIDER=openai`, and `OPENAI_API_KEY` in the server/worker secret store. To use an OpenAI-compatible self-hosted endpoint, set `AI_PROVIDER=local`, `EMBEDDING_PROVIDER=local`, `LOCAL_AI_BASE_URL`, `LOCAL_LLM_MODEL`, and `LOCAL_EMBEDDING_MODEL`. The latter must return **1536-dimensional** embeddings; otherwise processing fails safely. Reprocess documents after a model change. Source text and questions are sent to the configured endpoint; disclose and evaluate its retention policy before use.

## Operations

Back up PostgreSQL and object storage together, encrypt backups, test restores, and define deletion/retention schedules. Watch queue age, retries, dead-lettered ingestion jobs, failed `storage_deletions`, database capacity, HNSW build time, filtered recall, provider errors/rate limits, and retrieval/generation latency. Logs omit document content, but application metadata and persisted conversations are sensitive. Rotate credentials, configure HTTPS and secure reverse-proxy headers, limit uploads upstream, pin and update container/dependency versions, and set parser CPU/memory/network limits. The current queue polls by user and needs load testing and operational alerting before high-scale use. Environment files are ignored by Git and excluded from the Docker build context; never commit secrets.
