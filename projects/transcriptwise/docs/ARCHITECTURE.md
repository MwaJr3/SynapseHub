# Architecture and maintainability

## Boundaries

```text
React workspace ── same-origin /api/v1 ── FastAPI owned routes
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       │                     │                     │
                 SQLAlchemy DB       Persistent task rows     Safe exports
                       │                     │
               source + original        one worker loop
                                             │
                          ┌──────────────────┴──────────────────┐
                          │                                     │
                TranscriptRetriever protocol          LearningProvider protocol
                official Google/oEmbed                local / chat-completions
                          │                                     │
                       parser ── stable segments ── chunk plan / validation / merge
```

Retrieval does not import the AI engine. An additional authorized retrieval adapter returns a `RetrievedTranscript` (real metadata, original text, stable segments, language, method). Update retrieval selection in the task runner without changing analysis. A new learning provider implements the `generate` protocol and returns a validated `Guide`; it does not need to know how the transcript was acquired.

## Frontend

React 19, TypeScript, Vite, Tailwind 4 plus authored CSS, React Router, TanStack Query, React Hook Form/Zod, Radix dialogs, React Markdown/GFM and Lucide icons. Fonts are local dependency assets, not external font requests. Routes are split into lazy chunks for guide/review/library/settings/help/about. The home route is the usable workspace, while `/about` is the product explanation.

`src/lib/api.ts` owns typed same-origin requests, the in-memory CSRF token, downloads and clipboard behavior. `session.tsx` bootstraps cookie-backed identity, and `theme.tsx` handles local persistence plus system-theme media changes. Authentication UI is separate from source/guide components. Server cache keys are cleared/invalidated on identity changes. Private records are not stored in localStorage; only the theme is.

`InputComposer` handles genuine paste/file/URL submissions and actual retrieval polling. `Review` retains source segment IDs and timestamps. `GuidePage` orchestrates navigation, while editors, source references, quiz and flashcard components own their interactions. Library operations query actual stored data; activity numbers are database counts, not marketing placeholders.

## Persistence

SQLAlchemy models represent users, hashed sessions, transcripts, analyses, persistent processing tasks, quiz attempts and flashcard reviews. Ownership foreign keys and cascading deletion protect/clean private records. SQLite is the simple local option with foreign keys/WAL; PostgreSQL uses psycopg 3. Alembic migrations are authoritative: startup checks that the database revision matches the current migration head. No `create_all` replaces migrations.

Timestamps are stored as naive UTC consistently across SQLite/PostgreSQL and exposed as ISO 8601 strings with `Z`. Source IDs/timestamps are actual parser input references, never model-invented values.

## Task flow and recovery

Routes create owned task rows, returning immediately. One async worker claims queued rows atomically, performs external requests outside database transactions, and commits short progress/result updates. Polling reports actual task states and chunk counts. There is no fake elapsed-time progress animation that claims completed processing.

Initial analysis stores an immutable processing plan: source hash, chunk character size, provider/prompt fingerprint and version. Changing the global chunk size cannot move checkpoint boundaries on retry. Endpoint/model/prompt changes require a new guide rather than reusing mixed-engine checkpoints; credential rotation and output-budget fixes do not inherently invalidate the plan. Each valid initial chunk is committed before the next external call. On server restart, interrupted tasks become explicitly failed/retryable. A transient database failure pauses/retries the worker rather than silently killing it.

A failed initial task has `failed` or `partial` guide status. Partial output records its actual coverage and can be viewed/exported; retry reuses compatible valid chunks. Generated-section edits are locked until initial completion so retry cannot silently replace a manual edit; separately saved personal notes survive retry. Source edits are locked once linked to an analysis; duplication creates an independent editable source. A deleted workspace/task cannot be resurrected by a late result. An already-sent external request may still incur cost until it returns/times out.

The reducer merges source-ordered validated results, namespaces IDs, preserves case-sensitive text, and collapses genuinely duplicate content without silently losing all of its references. It does not make a second lossy model call. Workspace schema limits are explicit: at most 300 items/section, 150 questions and 150 cards. Excess combined output is sampled evenly across validated results (including the tail) with a prominent disclosure. Original input and unabridged initial chunk checkpoints remain available in JSON. Initial checkpoints are not a complete revision history of later manual edits/regeneration.

## Editing and regeneration

Sources use version guards; guides use atomic revision compare-and-swap updates. Concurrent stale writes receive 409. Changing a generated item automatically changes its provenance to `user_note`; client-supplied provenance cannot masquerade as an unchanged source quote. A renamed guide's JSON title is synchronized.

Section regeneration analyzes the original locked source with the requested level, validates replacement output, then replaces only the selected section/collection. Other sections and personal notes survive. If another edit lands while regeneration runs, that edit wins and the replacement fails with an explicit conflict. A failed regeneration leaves the old section usable. Requested quiz/cards are enabled even if disabled in the initial options; new study IDs do not inherit unrelated old review schedules.

## Study behavior

Objective quiz questions compare against stored validated choices; open-ended/application answers have no fake automatic correctness score. Answers are hidden by the UI until submission (this is a self-study tool, not an exam-security system; the guide API contains its answer data). Attempts are persistent. Flashcard ratings use a simple bounded interval heuristic, with due dates and history; there is no mastery prediction or claim of a validated learning algorithm.

## Scaling boundary

**Exactly one application instance/process, with one worker.** Do not use multiple Uvicorn/Gunicorn workers or replicas. Startup recovery, in-memory rate limits and the simple queue assume that boundary. PostgreSQL support does not make the worker horizontally safe. There is no Redis, vector store or distributed queue because the initial product does not need one.

Before scaling, separate worker ownership with leases/locking, add distributed rate/cost limits, improve database-side search and latest-review queries, paginate/virtualize very large guide collections, and measure actual workload. The current library search intentionally uses owned relational text/JSON queries rather than sending private library data to an embedding service.
