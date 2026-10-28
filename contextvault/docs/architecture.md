# Architecture

## Processing

```text
Browser → authenticated upload → validate size/type/name/signature → private object storage
    → document metadata + durable job → worker lease → validate → extract pages/sections
    → normalize → paragraph/sentence-aware chunks → versioned embeddings
    → atomic chunk replacement + pgvector HNSW/GIN indexes → READY
```

The HTTP handler does not parse the document or call an embedding provider. The PostgreSQL queue claims rows with `FOR UPDATE SKIP LOCKED`, records attempts, refreshes a five-minute lease, retries with exponential backoff, and marks an exhausted job FAILED. Expired leases are recovered; exhausted crashed jobs are dead-lettered. The monotonically increasing attempt number acts as a fencing token: stage updates, atomic indexing, heartbeats, completion and failures are conditional on the current lease, so a stale worker cannot overwrite a replacement worker. An already-started external embedding call can still run or incur charges. During reprocessing, a document is excluded from retrieval; chunk replacement and the READY transition share a transaction. If a worker crashes after committing the chunks but before completing its job, repeating the replacement is idempotent. Parser-level hard timeouts and process isolation are not implemented: deploy the worker with container CPU/memory/time limits and add malware scanning.

Deletion transactionally removes document metadata and cascading chunks, and writes object keys to `storage_deletions`. The worker retries object deletion up to ten times; attempt-conditional bookkeeping prevents a stale cleanup attempt from overwriting a newer one. Failed outbox items need an operator alert and manual retry. Previously generated conversation text can still quote a deleted document. Citations to moved, archived, removed or reprocessed chunks become unavailable in the original conversation. A moved or archived source can become available again if restored without reprocessing; deleted/replaced chunk references cannot.

In local embedded mode, a single application process owns PGlite and runs a timer-based worker. In server PostgreSQL mode, `npm run worker` is a separate process. The worker currently polls user IDs and then claims jobs in each user's RLS context; this is simple and auditable, but is not optimized for large tenant counts or high-throughput scheduling. No separate Redis service is required. Queue records, retries, and deletion outbox entries reside in PostgreSQL.

## Answer

```text
Authenticated user + explicit collection
  → authorization → bounded follow-up query → query embedding (vector/hybrid only)
  → owner/collection scoped full-text + model-scoped pgvector candidates
  → threshold / fusion / optional rerank → top-K evidence
  → versioned system prompt + bounded recent user questions + untrusted evidence
  → provider → validate citation labels → recheck/lock evidence → answer + source chunks + timings
```

`lib/db/schema.sql` is the authoritative migration and captures foreign keys, constraints, indexes and RLS. Controlled parameterized SQL is used directly through `pg`/PGlite rather than an ORM; pgvector operators, row-level context and queue leasing remain visible. `lib/documents`, `lib/ai`, `lib/rag`, `lib/prompts`, and `lib/storage` separate concerns. `app/api/[...path]` dispatches authenticated route handlers. The React workspace is in `components/`.

Per-response records include model, prompt version, provider-reported token counts when available, retrieval and generation timings, retrieval strategy and selected chunk IDs/scores. Upload processing stores stage durations. Structured logs record IDs/counts/timings, not raw source text. These records are not a substitute for a production tracing/metrics backend. Avoid enabling verbose provider/proxy logging of private content.
