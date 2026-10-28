# ContextVault — AI Retrieval-Augmented Knowledge Platform

A production-oriented RAG system using PostgreSQL + pgvector to turn private document collections into searchable, citation-grounded knowledge bases. The engineering question is not “can a model answer?” but **which authorized evidence was retrieved, how was it ranked, and can the answer be traced back to it?**

ContextVault is an independent Next.js 15 / React / TypeScript application in this repository. It has an observable ingestion queue, PostgreSQL vector and full-text retrieval, owner-scoped collections, conversations, citations, an inspection playground, evaluation cases, and a fictional demonstration corpus.

## Start the local demo

Requires Node.js 22.12 or newer within Node 22 (or a supported Node 24/26+ release) and npm. No database, API key, or paid service is required.

```bash
cd contextvault
npm install
npm run dev
# Open http://localhost:3000
```

The app starts **embedded PGlite PostgreSQL with the actual pgvector extension** in `.data/postgres`, creates six fictional Markdown documents across three collections, and processes them into vectors. The shared fictional **Alex Morgan** demo workspace opens automatically in development. It is for demonstration only: **do not upload private information to this shared demo account**. The banner and upload dialog disclose this. The default deterministic hash embedding is *not* a semantic model; the mock assistant extracts sentences rather than generating a free-form AI answer. No text leaves the machine for an AI provider in this default mode.

To create an isolated account, use the account menu → **Sign out** → **Create account**. Each registered account has its own collections. Set `DEMO_MODE=false` to disable automatic demo entry. The demo is not automatically enabled in production; never expose a shared demo account publicly with private data.

Try the **Research Library** and ask “What is retrieval-augmented generation?” Open a source pill, inspect retrieval, then ask a follow-up. The **RAG Playground**, **Evaluation**, and **Architecture** sections show the pipeline and trade-offs. The demo account has developer access; regular accounts do not. A trusted operator can grant it with `npm run grant:developer -- user@example.com` (stop the web server first in embedded mode).

## Start the PostgreSQL + Docker stack

With Docker Compose v2 installed:

```bash
cd contextvault
cp .env.compose.example .env
# Edit .env and set the four strong, unique secrets; use URL-safe PostgreSQL passwords.
docker compose up --build -d --wait
# Register at http://localhost:3000; no shared demo is enabled.
```

This starts PostgreSQL 16 + pgvector, RustFS, migrations, the app and a separate worker. The app is bound to localhost by default; mock AI makes no paid calls. `docker compose down` preserves data volumes; `docker compose down --volumes` deletes them. The example uses RustFS root credentials and is **not production-hardened**. See [deployment](docs/deployment.md) for security, readiness, tests, backups and production alternatives.

## What is implemented

- PDF, TXT, Markdown and DOCX validation; 10 MiB size limit; PDF/DOCX signatures; UTF-8 checks; bounded DOCX archive inspection; page-aware PDF extraction; section-aware paragraph/sentence chunking with configurable size and overlap. Scanned PDFs require OCR, which is not included.
- Local filesystem storage for local development and an S3-compatible adapter for deployment. Binaries are separate from relational metadata. Deleting a document cascades its chunks immediately and queues object deletion in a durable outbox.
- PostgreSQL-backed `SKIP LOCKED` job queue with attempt-fenced leases, heartbeat, retry/backoff, idempotent chunk replacement, safe failure messages, and dead-letter states. The embedded demo runs an in-process worker; a separate worker runs against PostgreSQL.
- pgvector `vector(1536)`, HNSW cosine index, GIN full-text index, model/version filtering for vectors, embedding-independent keyword and semantic-vector/hybrid strategies, reciprocal-rank fusion, optional lexical reranking, top-K/threshold and document/tag filters. The schema uses 1536 dimensions because **OpenAI `text-embedding-3-small` defaults to 1536**. Local models must also return 1536 dimensions; changing dimensions requires a migration and re-indexing.
- Mock, OpenAI and OpenAI-compatible self-hosted provider adapters for embeddings and generation. Provider selection is explicit and invalid values fail closed. External AI sends document chunks and questions to that provider; review its terms before enabling it.
- Server-side authentication with scrypt password hashes, opaque hashed database sessions, HttpOnly/SameSite cookies, origin checks, rate limits, owner checks, collection-scoped retrieval, composite foreign keys, and PostgreSQL RLS policies. The PostgreSQL runtime role must be non-superuser and `NOBYPASSRLS`; see [security](docs/security.md).
- Conversation history and bounded follow-up context, source inspection, citations tied to retrieved chunks, configurable developer playground with side-by-side retrieval comparison, basic evaluation, usage/timing records, and structured logs without raw document text.

## Configuration

Copy `.env.example` to `.env.local` only when changing defaults. Environment files and `.data/` are gitignored. Never commit real credentials.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection for the app/worker. Without it, the app uses local PGlite. Run the migration with a separate privileged connection first. |
| `DEMO_MODE` | `true` explicitly enables the **shared** fictional demo; `false` disables it. Default is development-only for embedded mode. |
| `AI_PROVIDER` | `mock` (default), `openai`, or `local`. |
| `EMBEDDING_PROVIDER` | `mock` (default), `openai`, or `local`. Incompatible model names are filtered and must be reprocessed. |
| `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL` | Server-only OpenAI settings. Using them sends the necessary text to OpenAI. |
| `LOCAL_AI_BASE_URL`, `LOCAL_LLM_MODEL`, `LOCAL_EMBEDDING_MODEL`, `LOCAL_AI_API_KEY` | Server-only OpenAI-compatible endpoint. The embedding model **must return 1536 values**. Even a “local” endpoint receives document text; verify where it is hosted. |
| `STORAGE_PROVIDER`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Set `STORAGE_PROVIDER=s3` for private S3-compatible object storage. Default is local filesystem. |
| `PGLITE_PATH` | Optional embedded database path; use only with a single running application process. |

Changing embedding providers/models requires reprocessing the relevant documents. Vectors from different model identifiers are never compared, even when they share a dimension.

## Verification

```bash
npm run typecheck
npm run lint
npm test                       # unit + PGlite/pgvector integration/security tests
npx playwright install chromium # first time on a supported machine
npm run test:e2e               # starts an isolated dev server on port 3010
npm run build
npm run benchmark              # synthetic HNSW vs exact search smoke test
npm run evaluate               # fictional dataset; run with the web server stopped in PGlite mode
```

The tests include registration-to-PDF-to-citation browser flow, keyboard/mobile retrieval comparison, page extraction, vector ordering, RLS with a non-bypass role, cross-user denials, source changes during generation, stale-worker fencing, invalid uploads, provider failures/retries, best-effort abort propagation, follow-ups, unsupported questions, and chunk deletion. The Compose CI workflow additionally exercises PostgreSQL, object storage, the separate worker, outage recovery and persistence; the smoke test is for **disposable stacks only**. The small benchmark is **not** a production performance or recall claim. `samples/evaluation.json` contains fictional questions, expected evidence, and answer characteristics; see [evaluation](docs/evaluation.md) for metric limitations.

## Deployment & details

- [Deployment and Docker Compose](docs/deployment.md) — PostgreSQL/pgvector, least-privilege role, object storage, worker, configuration, backup and monitoring.
- [Portfolio case study](docs/portfolio-case-study.md) — problem, engineering decisions and honest boundaries.
- [Architecture](docs/architecture.md) — data model, processing queue and request flow.
- [RAG pipeline](docs/rag.md) — chunking, hybrid ranking, citations, grounding and context windows.
- [pgvector](docs/pgvector.md) — cosine/inner product, HNSW vs IVFFlat, indexing and recall.
- [Security and privacy](docs/security.md) — isolation boundaries, RLS, uploads, data handling and prompt-injection limits.
- [Evaluation](docs/evaluation.md) — dataset, metrics, reproducibility and limitations.
- [Verification record](docs/verification.md) — checks run and what remains unverified.

### Important limitations

This is a **production-oriented reference application, not a claim of production readiness or perfect grounding**. Before handling sensitive data, independently review the custom authentication and RLS deployment, add MFA/email verification/password recovery, malware scanning and parser sandbox/resource limits, configure operational monitoring/backups and a retention policy, and perform a security review. The built-in account system is not a replacement for a hardened identity provider. The mock embedding is lexical hashing, not semantic search. Citation checks ensure references point to retrieved chunks, not that every statement is entailed by them; prompt injection and hallucination remain possible. Answers are buffered until citation labels are validated rather than streamed token-by-token. Stop propagates to provider fetches when the hosting runtime forwards the disconnect, but cannot guarantee stopping server work or billing. No OCR, sharing/RBAC between users, automated faithfulness judge, streaming provider output, guaranteed distributed cancellation, exact cost calculation, or automatic data-retention schedule is implemented. The current Next 15-compatible ESLint 9 development tooling is out of support and should be upgraded with the framework/toolchain. See the linked docs for further limits.
