# Verification record

## Local checks

Sandbox run on 2026-10-28 with Node.js 22.22.3 and deterministic mock AI providers:

- `npm ci`, then `npm run check`: typecheck, lint, **52 unit/integration tests**, and an optimized Next.js production build passed. Most application tests use embedded PGlite PostgreSQL with pgvector.
- `npm run test:e2e`: **2 Playwright flows** passed. They cover registration, collection creation, real PDF upload/indexing, grounded answers and source inspection, follow-up and insufficient-evidence behavior, sign-out/sign-in persistence, and the retrieval-comparison interface including keyboard interaction and a 390px viewport. The sandbox used an externally supplied Chromium executable and library path; ordinary machines can install Playwright's supported browser.
- A separate native **PostgreSQL 16.14 server with pgvector 0.8.1**, an S3-compatible local **S3rver emulator**, the production app, and a separate worker passed `tests/stack/smoke.mjs`. The test covered a real PDF through object storage and the worker, a cited answer, two-user authorization, actual pgvector/HNSW, RLS reads and rejected cross-owner writes under a non-owner `NOSUPERUSER NOBYPASSRLS` runtime role, invalid upload, persisted database/object data across service restarts, and durable object deletion. These mock-provider checks did **not** use Docker or the MinIO server.
- During that test, PostgreSQL was stopped and restarted while the app and worker stayed running. Liveness remained 200, readiness changed from 200 to 503 and back, and the same worker resumed ingestion and deletion. A regression test covers the idle `pg` pool error that had previously terminated the worker.
- The other integration tests cover source-scope changes during generation, stale worker attempts, keyword fallback when embeddings fail, model/version boundaries, citation-label rejection, provider abort propagation, PDF/DOCX extraction, retries, checksum tampering, metadata filters, rate limits and cleanup. A mock prompt-injection fixture is tested; this is not a guarantee about real models.
- `npm audit --audit-level=high` reported **zero vulnerabilities across production and development dependencies** at the time of the run; advisories change. ESLint 9 is itself out of support, despite the audit result, and should be upgraded together with the Next.js lint integration.
- On 2026-10-27, `PGLITE_PATH=memory:// npm run evaluate` ran six fictional examples: mean document precision **0.75** and document recall **1.0** on this tiny dataset. These figures are configuration-specific and do not establish factual faithfulness.
- On 2026-10-27, `npm run benchmark` used a 500-vector, 10-query in-memory HNSW smoke test, confirmed index use, and compared approximate results against exact results. The observed recall@5 was 1.0 for this synthetic sample; it does not establish production latency or recall.
- A separate `npm ci --omit=dev` installation previously ran the PGlite migration and production app. The Docker image uses that production dependency profile; its actual Compose build and MinIO integration are tested separately by the CI workflow.

## Infrastructure CI

`.github/workflows/contextvault.yml` builds the Docker Compose services and runs the disposable PostgreSQL/MinIO/worker smoke test, outage recovery, restart/persistence and object-deletion checks. Docker was not available in the local sandbox; consult the workflow result for the actual Compose run rather than interpreting the S3rver test as a MinIO or Docker test. See [deployment](deployment.md) for how to repeat it.

## How the supplied skills were applied

The improvement pass followed the test-first, systematic-debugging and fresh-verification practices in [superpowers](https://github.com/MwaJr3/superpowers/tree/main/skills). Guidance from [claude-skills](https://github.com/MwaJr3/claude-skills/tree/main/skills) informed scoped hybrid retrieval, model boundaries, PostgreSQL lease fencing, failure-path security tests and role-based browser checks. The [frontend-design skill](https://github.com/MwaJr3/claude-plugins-official/tree/main/plugins/frontend-design/skills/frontend-design) informed the comparison interface, keyboard support and responsive screenshot review. These were guidance, not independently executed certification tools.

**Still unverified:** real external/self-hosted AI calls, production-scale filtered recall/load, disconnect propagation through the target hosting stack, real-world prompt-injection resistance, malware scanning, or an independent security review. Answers are buffered rather than token-streamed, citation-label checks do not establish semantic entailment, and cancellation is best effort. Compose uses MinIO root credentials and is not a hardened deployment. The original production quality gate is therefore **not fully verified**. See [deployment](deployment.md) and [security](security.md) before handling sensitive data.
