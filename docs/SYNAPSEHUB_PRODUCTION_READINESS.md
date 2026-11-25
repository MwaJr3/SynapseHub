# SynapseHub production-readiness assessment and closure plan

**Status:** assessment complete — closure plan pending execution.
**Assessed:** 2026-11-25, branch `arena/e0b5b0be-synapsehub`, base commit `2df6e3b`
(the `Dev` head at assessment time).
**Basis:** source inspection, full local test execution, live Supabase verification
through the connected Supabase account, GitHub Actions history, and the recorded
deployment log in [SYNAPSEHUB_RELEASE.md](SYNAPSEHUB_RELEASE.md).

This is the single release assessment for SynapseHub.
[SYNAPSEHUB_CONNECTED.md](SYNAPSEHUB_CONNECTED.md) and
[SYNAPSEHUB_RELEASE.md](SYNAPSEHUB_RELEASE.md) remain the implementation and
execution logs; this document decides what each capability's evidence actually
proves, and what is still required to release.

---

## 1. How to read this document

### Maturity levels (the release gate)

| Level | Required evidence |
| --- | --- |
| **M1 Implemented** | Feature exists in source, has automated tests, and passes its defined acceptance criteria. |
| **M2 Configured** | Real environment configuration exists; placeholders and demo credentials are rejected. |
| **M3 Integration-tested** | Tested against the actual external dependency, including relevant failure cases. |
| **M4 Deployed** | A deployment exists with a recorded commit, verified configuration, successful migrations and passing smoke tests. |
| **M5 Production-verified** | External workflows succeed, authorization and data isolation are verified against the running system, operational monitoring works, and backup/recovery has been tested. |

A green unit-test suite is never sufficient evidence for M4 or M5.

### Verification states (how deep the evidence goes)

Every capability carries one of four states. They are deliberately not collapsed
into a checkbox:

| State | Meaning |
| --- | --- |
| `not implemented` | No source delivers it. |
| `implemented, unverified` | Source and tests exist; the claim has not been exercised outside tests. |
| `verified in development` | Exercised against real dependencies from a development environment (this sandbox, CI, or a live database session). |
| `verified in production` | Exercised against the deployed system by an end user path. **No capability currently holds this state.** |

### Production blockers vs future capabilities

Only the items in §4 block a limited, honestly documented initial release.
The items in §5 are real future work; they are explicitly **not** release
blockers, and expanding them must not stall the release.

---

## 2. Evidence executed for this assessment (2026-11-25)

All of the following were run in this session against base commit `2df6e3b`.
Nothing below is copied from an earlier log.

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| E1 | Backend API suite | `pytest -q backend/tests` | **23 passed** in 0.93s |
| E2 | Web suite | `npm test` | **744 passed**, 31 files, 60.9s |
| E3 | Typecheck | `npm run typecheck` | pass |
| E4 | Scoped lint | `npx eslint src/features/synapsehub packages/synapse-client src/App.tsx vite.config.ts` | pass |
| E5 | Production build | `npm run build` | pass (2.82s; `WorkspaceRoute` chunk 18.75 kB) |
| E6 | Native mobile security | `npm run test:security` (native/mobile) | **4 passed**; `npm audit`: **0 vulnerabilities** |
| E7 | Native mobile typecheck | `npm run typecheck` (native/mobile) | pass |
| E8 | Browser smoke (Chromium) | `node tools/synapsehub-smoke/smoke.mjs` against a local dev server | **PASS** — "guest source→task persistence; SDK sign-in (mock auth); account isolation; cloud conflict; 390px layout; no page errors." |
| E9 | Live RLS / isolation / CAS | `infrastructure/supabase/security_checks.sql` executed against the connected Supabase project | **all six assertions passed** (see §3.2); `rollback` verified: 0 workspaces, 0 documents, 0 chunks, 0 fixture users remain |
| E10 | Live schema state | SQL against connected project | `sh_workspaces`, `sh_documents`, `sh_chunks` all exist with `relrowsecurity = true`; all 3 RPC functions exist |
| E11 | Live service health | Supabase health check | `auth` (GoTrue v2.198.0), `db`, `rest`, `storage` — all `ACTIVE_HEALTHY` |
| E12 | Live auth configuration | Supabase auth config read | `mailer_autoconfirm = false` (confirmation required ✓); `refresh_token_rotation_enabled = true` ✓; `mailer_allow_unverified_email_sign_ins = false` ✓; **`site_url = http://localhost:3000`** ✗; `uri_allow_list = ""` ✗ |
| E13 | Live migration history | Supabase migrations list | `synapsehub_connected_workspace` applied 2026-10-28 04:15:08 ✓ |
| E14 | CI at base commit | `gh run list` | `SynapseHub connected workspace` on `Dev` @ `2df6e3b`: **success** (run 45595588873, 52s) |
| E15 | Runtime probe workflow | `gh run list --workflow synapsehub-runtime.yml` | **never dispatched** |
| E16 | Native release workflow | `gh run list --workflow synapsehub-native-release.yml` | **never dispatched** |

**Evidence boundaries of this session (stated, not hidden):**

- **E8 configuration:** the smoke run used syntactically valid placeholder
  `VITE_SUPABASE_*` values so the Supabase client would exist; every Supabase
  network call was intercepted by Playwright route mocks. No external service
  was contacted, and no claim of live login is made. (Without any
  `VITE_SUPABASE_URL`, `CloudPanel.tsx:106` renders a "not configured" notice
  instead of the sign-in form — an environment gap, not a code defect.)
- **Vercel:** the connected Vercel account returned **access denied** for
  project listing (token scope). The current live deployment state could not be
  verified through the connector. The most recent recorded state is in
  [SYNAPSEHUB_RELEASE.md](SYNAPSEHUB_RELEASE.md): a failed build, a corrected
  deployment denied by the free-tier daily quota, and **no successful release
  deployment**. Treating "Deployed" as unproven is the only honest reading.
- **E9 execution model:** `security_checks.sql` is designed to run as the
  migration owner in one transaction and roll back. It was executed exactly that
  way; the post-run count check (E10/E9) confirms nothing persisted.
- **Not run in this session:** Playwright e2e (`e2e/`) — it covers the portfolio
  and Vocal Separator only, with no SynapseHub specs; Ollama probes (no endpoint
  or model is configured); real email delivery (requires a real account and a
  correct Site URL); native device/installer tests.

---

## 3. Capability assessment

Each capability records: implementation (source → function), required
configuration, acceptance tests, execution results, deployment evidence,
outstanding risks, and classification.

### 3.1 Local workspace (offline, local-first) — **M1 · verified in development**

| Field | Evidence |
| --- | --- |
| Source | `src/features/synapsehub/workspace.ts` — `decodeWorkspace`, `captureItem`, `updateItem`, `persistWorkspace`, `safeUrl`; `SynapseHubPage.tsx` capture/edit/complete flows; storage key `synapsehub.workspace.v1` |
| Configuration | none required (local-first by design) |
| Acceptance tests | 15 tests: `SynapseHubPage.test.tsx` (3 — capture→derive→complete→restore, empty search/keyboard, corrupt-data recovery), `workspace.test.ts` (6 — backlinks, persistence, validation, dangling relations, stale-tab writes, quota failures), `CloudPanel.test.tsx` (6) |
| Execution | E2 (part of 744), E8 local flow: source→task persistence across reload verified in Chromium |
| Deployment evidence | n/a — runs in the browser |
| Risks | none material; quota/JSON-export recovery paths are tested |

### 3.2 Authorization and data isolation (RLS) — **M3 · verified in development**

| Field | Evidence |
| --- | --- |
| Source | `infrastructure/supabase/001_connected_workspace.sql` — owner policies on `sh_workspaces`/`sh_documents`/`sh_chunks`; `sh_search_chunks` filters `owner_id = auth.uid()` on both tables; `revoke … from anon` on all tables and functions. `backend/synapsehub/gateway.py` — every database call carries the caller's JWT; `__init__` rejects `sb_secret_` keys with 503; `main.py:authenticated()` verifies the session before any private route |
| Configuration | `SUPABASE_URL` (https) + `SUPABASE_PUBLISHABLE_KEY` only; **no service-role key exists in the codebase by construction** |
| Acceptance tests | `security_checks.sql` (6 assertions), `test_auth_required`, `test_gateway_forwards_user_token_and_rejects_expiry`, `test_rag_requires_consent_and_blocks_excluded_source` |
| Execution | **E9 today: all six assertions passed against the live database** — Document RLS (only own row visible), Chunk RLS, cross-user source returns 0 rows, own retrieval returns 1 row, initial CAS write accepted, stale CAS write rejected; rollback verified clean. E10: RLS enabled on all three tables |
| Deployment evidence | migration applied (E13), tables and functions present (E10), empty of fixtures (E10) |
| Risks | The live check exercises the database directly, not the full API→gateway→PostgreSQL path with a real end-user JWT. That full path is closure step **C4** |

### 3.3 Cloud workspace synchronization (CAS) — **M3 · verified in development**

| Field | Evidence |
| --- | --- |
| Source | `main.py:put_workspace` (L88) → `gateway.rpc('sh_save_workspace', …)`; `sh_save_workspace` performs compare-and-swap (`revision = expected_revision`); 409 on conflict with an explicit no-overwrite message |
| Configuration | as 3.2; browser side needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Acceptance tests | `test_sync_validates_and_rejects_conflicts`, `test_workspace_rejects_unsafe_urls`, CloudPanel conflict/payload tests, smoke cloud-conflict flow (E8) |
| Execution | E1, E2, E8 pass; **E9 live: initial CAS accepted, stale CAS rejected** |
| Deployment evidence | none — API not yet on a successful deployment (§3.9) |
| Risks | Sync is explicit push/pull only (by design, documented). Per-process rate limit only — see §3.10 |

### 3.4 PDF ingestion (bounded, private, idempotent) — **M1 · verified in development**

| Field | Evidence |
| --- | --- |
| Source | `backend/synapsehub/pdf.py` — `MAX_BYTES` (4 MiB on Vercel, 5 MiB in container), `MAX_PAGES` 100, `MAX_TEXT` 200 000, `extract_pdf`, `_child` (RLIMIT_AS 512 MiB, RLIMIT_CPU 15 s), `bounded_extract`; `main.py:ingest` (L103, 5/min rate limit, SHA-256 idempotency via `sh_ingest_pdf`, `on conflict (owner_id, sha256) do nothing`); `main.py:pdf` (L125, `no-store`, `nosniff`); `main.py:delete_document` (L132, cascading indexes); `bounded_body` middleware (L24) caps all bodies at the ASGI receive boundary |
| Configuration | API env as 3.2; client pickers cap at 4 MiB to fit the Vercel request envelope |
| Acceptance tests | `test_pdf_page_citations_and_deletion` (real generated PDFs, byte round-trip), `test_ingest_invalid_and_bounded` (oversize, non-PDF, page/text limits) |
| Execution | E1 pass |
| Deployment evidence | **none** — the serverless subprocess path has never run on the actual host. The release log records this as an explicit review item (platform subprocess/function limits; container profile fallback) |
| Risks | Serverless execution limits for the bounded parser are unverified on the real deployment. Object storage for originals (`bytea` today) has response-size limits on serverless hosts — recorded release gate |

### 3.5 Retrieval within its documented scope — **M3 · verified in development**

| Field | Evidence |
| --- | --- |
| Source | `sh_search_chunks` — PostgreSQL `websearch_to_tsquery('english', …)`, `ts_rank_cd`, owner + selected-source filter, `limit 8`; `main.py:ask` (L137) — evidence mode with defense-in-depth rejection if the adapter returns an excluded source |
| Configuration | none beyond the database (FTS is native) |
| Acceptance tests | `test_rag_requires_consent_and_blocks_excluded_source`; live assertions in E9 (cross-user 0 rows, own 1 row) |
| Execution | E1, E9 pass |
| Deployment evidence | database side verified live (E10, E13); API path not yet on a deployment |
| Risks | **Documented scope is keyword full-text, not semantic search.** Embeddings are §5 future work and must not be implied in release notes |

### 3.6 Citation integrity and source isolation in answers — **M3 · verified in development**

| Field | Evidence |
| --- | --- |
| Source | `backend/synapsehub/rag.py` — `generate_answer`, `validate_answer` (citation-ID membership + exact-quote validation); `main.py:ask` — explicit `consent` gate for generation, excluded-source rejection (502), honest response messages ("quote validation is not proof of entailment") |
| Configuration | generation requires `OLLAMA_URL` + `OLLAMA_MODEL`; blank disables generation (fail-closed: `test_ai_not_configured_no_fallback`) |
| Acceptance tests | `test_ai_citation_validation`, `test_rag_requires_consent_and_blocks_excluded_source`, `test_cloud_rag_still_validates_citations`, probe test `test_probe_never_calls_generation_without_explicit_flag` |
| Execution | E1 pass (all citation tests mocked-provider) |
| Deployment evidence | none for generation; retrieval-side isolation verified live (E9) |
| Risks | Quote validation proves the quote exists in the cited passage — **not** that the claim follows from it. This limitation is already surfaced in the API response text and must stay in release notes |

### 3.7 AI generation (provider integration) — **M1 · implemented, unverified**

| Field | Evidence |
| --- | --- |
| Source | `backend/synapsehub/ollama_cloud.py` (cloud adapter, sanitized statuses, no local→cloud fallback, server-only key), `rag.py`, consent gate in `main.py:ask` |
| Configuration | `OLLAMA_URL`, `OLLAMA_MODEL` (blank = disabled, by design); optional server-only `OLLAMA_API_KEY`; `OLLAMA_PROVIDER` (`local` default) |
| Acceptance tests | 9 adapter tests (schema handling, empty-key fail-closed, 401/402/404/429 sanitization without retry, network-failure sanitization, citation validation preserved, local endpoint never receives the cloud key), 4 probe tests, citation tests |
| Execution | E1 pass — **all with mocked inference** |
| Deployment evidence | **none.** No endpoint or model has been provided; `synapsehub-runtime.yml` has never been dispatched (E15) |
| Risks | Any release claim must say generation is disabled pending operator configuration. No benchmark or output-quality evidence exists |

### 3.8 Authentication, session and email delivery — **M1 · implemented, unverified**

| Field | Evidence |
| --- | --- |
| Source | `src/features/synapsehub/auth.ts` (Supabase PKCE client, `persistSession`, `autoRefreshToken`, `detectSessionInUrl`); `CloudPanel.tsx:signIn` (L70 — sign-in/sign-up/reset, email-verification messaging); `main.py:authenticated` (L51 — bearer verification); `gateway.verify` |
| Configuration | browser: `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`; server: `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`; **per-deployment Supabase Auth URL setup**: Site URL + exact `/synapsehub` confirmation/recovery redirect |
| Acceptance tests | `test_auth_required`, gateway expiry test, 6 CloudPanel tests (auth adapter, email-verification communication, account/guest separation), smoke mock sign-in (E8), probe test `test_probe_rejects_email_verification_disabled` |
| Execution | E1, E2, E8 pass; **E12 live:** confirmation required ✓, unverified sign-ins disallowed ✓, refresh rotation ✓, signup enabled |
| Deployment evidence | **Site URL is still `http://localhost:3000` and the redirect allow-list is empty (E12).** Email links would point at a non-existent origin. No real account has completed signup → confirmation → login. Delivery itself (mail provider path) has never been exercised |
| Risks | This is the single largest gap between "tests pass" and "a user can get in." Default Supabase mail is unconfigured (`smtp_host = null`) with a 2 emails/hour rate limit — acceptable for a limited beta, but must be confirmed in the real flow |

### 3.9 Deployment and database configuration — split verdict

**Database (Supabase): M4 · verified in development against a deployed service.**
Project `synapsehub` (`jpwbkdwxloxtmxnrykcq`, eu-west-1, PostgreSQL 17.11) is
`ACTIVE_HEALTHY` with auth/db/rest/storage healthy (E11); migration applied
(E13); schema, RLS and functions verified live (E10); RLS/CAS checks passed
live (E9); no fixture data retained (E10). Backup/verification of this database
is §3.12.

**Application (Vercel): M1 · implemented, unverified.**

| Field | Evidence |
| --- | --- |
| Source | `api/index.py` (ASGI entry → same `synapsehub.main:app`), root build pipeline (E5), `backend/Dockerfile` container profile |
| Configuration | Vercel project `synapsehub-workspace` (`prj_M0GHRnxrkVF7OqikrNmXgtJf5QAD`) exists; deployment settings hold only the public Supabase URL/key — no service-role keys, no model credentials (per release log) |
| Acceptance tests | build (E5), CI (E14), deployment-source regression check added after the `.vercelignore` incident |
| Execution | E5, E14 pass |
| Deployment evidence | **No successful release deployment exists.** Attempt 1 (`dpl_Gsfv77ighQzs57oz2H1WkSDLxwfq`, commit `37da83f`) failed the frontend build (unanchored `.vercelignore`); fixed in `2f3571c`; the corrected request was denied `402 api-deployments-free-per-day`. The intended alias `synapsehub-workspace-m-corp2.vercel.app` was never assigned. The Vercel connector could not be re-checked today (access denied) |
| Risks | Free-tier quota and (per the log) default deployment protection. `/api/health` on the real host, authenticated sync, and PDF upload/download there are all unverified |

### 3.10 Rate limiting and abuse controls — **M1 · verified in development**

| Field | Evidence |
| --- | --- |
| Source | `main.py:rate_limit` (L60) — per-process sliding window: sync 60/min, ingest 5/min, ask 10/min; `bounded_body` (L24) request-size caps; `pdf_slots` semaphore(2); Supabase-side auth rate limits live (`rate_limit_email_sent = 2`, token refresh 150, etc.) |
| Configuration | none |
| Acceptance tests | `test_throttle`, `test_ingest_invalid_and_bounded` |
| Execution | E1 pass; Supabase auth limits confirmed live (E12) |
| Deployment evidence | none on the real host |
| Risks | **The source comment states it: "Production requires shared rate limiting at ingress."** The in-process dictionary resets on redeploy and does not span serverless instances. Recorded release gate |

### 3.11 Durable processing and object storage — **not implemented (declared release gate)**

No persistent job queue exists; extraction runs in-process behind a semaphore
(`pdf_slots`), and originals live in `bytea` columns. Both are recorded as
release gates in [SYNAPSEHUB_RELEASE.md](SYNAPSEHUB_RELEASE.md). Ingestion is
synchronous and idempotent, so a retry is safe — but there is no durable
"processing" state to recover. For a limited beta the honest position is:
synchronous bounded ingestion, no background jobs, no object storage.

### 3.12 Observability, backup and recovery — **not implemented**

- `/api/health` reports configuration flags and limits — not external
  connectivity, not latency, not error rates. No structured logging,
  correlation IDs, metrics or alerts exist.
- No documented backup or restore procedure for the Supabase project was found
  in the repository.
- Client-side recovery exists and is tested (JSON export with raw-data
  fallback, corrupt-storage preservation — E2/E8), but that is user data
  recovery, not operational backup.
- M5 requires tested backup/recovery; this capability is furthest from the gate.

### 3.13 Native mobile and desktop — **M1 · implemented, unverified**

| Field | Evidence |
| --- | --- |
| Source | `native/mobile/` (Expo app: sign-in, task list, PDF picker/upload, source selection, evidence views; `security/dependencies.test.cjs`), `native/desktop/` (Tauri v2 entry, restricted capabilities, CSP) |
| Configuration | same Supabase public config; `SYNAPSE_API_ORIGIN` for native web dev; GitHub variables `SYNAPSE_SUPABASE_URL`, `SYNAPSE_SUPABASE_PUBLISHABLE_KEY`, `SYNAPSE_API_ORIGIN` (never set — creation returned 403 for the integration) |
| Acceptance tests | mobile security suite (E6: 4 passed, 0 vulnerabilities), mobile typecheck (E7), CI bundle exports (android + iOS Hermes) in `synapsehub.yml` (E14) |
| Execution | E6, E7, E14 pass |
| Deployment evidence | `synapsehub-native-release.yml` has **never been dispatched** (E16) — no APK/.app artifacts exist; no device or emulator testing; no signing |
| Risks | A workflow definition is not a compiled installer. Desktop has never been built (no Rust toolchain in CI for it) |

---

## 4. Production blockers (must close before an initial release)

Ordered by dependency. Each item names the evidence that closes it.

| # | Blocker | Current state | Closure evidence |
| --- | --- | --- | --- |
| **B1** | **Successful deployment of the application** | No successful deployment exists (§3.9); Vercel state unverifiable today | After quota reset: deploy latest commit to `synapsehub-workspace`; record deployment ID + commit; `/api/health` returns `cloud_configured: true` on the real host; frontend loads; build smoke passes → capability moves to **M4** |
| **B2** | **Real authentication end-to-end** | Code + mocked tests + live auth config OK; no real login ever completed (§3.8) | With B1 done: set Supabase Site URL + exact `/synapsehub` redirect to the real origin; one authorized account completes signup → confirmation email → confirmed login → session refresh; recorded manually or scripted → **M3** |
| **B3** | **Verified email delivery** | Confirmation required (live ✓) but links point to `localhost` (E12); delivery never exercised | Same as B2, plus: recovery email completes the reset loop on the real host → **M3** |
| **B4** | **Full-stack data path with a real session** | DB layer verified live (E9); API path only with mocked gateway | Real account: push workspace (200 + revision), pull, conflict → 409; PDF upload → listed → download → cited page; delete → gone. Against the deployed API → **M3** for §3.3, §3.4, §3.5 |
| **B5** | **Ingress rate limiting decision** | In-process only (§3.10) | Either deploy a shared limiter at ingress, or document and accept the per-process limit for the beta with the risk stated in release notes |
| **B6** | **PDF parser on the real host** | Bounds tested locally; serverless path unverified (§3.4) | B4 upload on the actual host, including an oversize file (413/422) and a 100-page file; if serverless cannot run the subprocess safely, switch to the container profile and re-verify |
| **B7** | **Runtime probe workflow dispatched** | Never run (E15) | Set the three `SYNAPSE_*` GitHub variables; dispatch `synapsehub-runtime.yml --cloud`; run log shows `supabase_auth_reachable_confirmation_required` + `anonymous_library_access_denied` |
| **B8** | **Backup/recovery for the database** | Nothing documented (§3.12) | Written procedure + one successful restore test (or a documented, verified Supabase PITR configuration) → prerequisite for **M5** |

**Explicitly not blockers:** everything in §5, native store publication,
desktop signing, and any feature not listed above.

## 5. Future capabilities (not release blockers)

OCR for scanned PDFs · document annotation · arbitrary file-type ingestion ·
semantic/embedding retrieval · real-time collaboration · offline synchronization
· advanced model integrations · gamification · mobile/desktop store releases.

These become requirements only if the product scope says so — never as a
side-effect of "while we're in there." Each is recorded in
[SYNAPSEHUB_CONNECTED.md](SYNAPSEHUB_CONNECTED.md) as a known boundary today.

## 6. Closure plan

Phases are strictly ordered; a phase does not start before the previous one's
evidence exists. This keeps the scope realistic — no feature expansion becomes
an accidental release blocker.

| Phase | Actions | Unlocks |
| --- | --- | --- |
| **P1 — Deploy** (B1) | Wait for Vercel quota reset → deploy latest commit to the existing project → verify `/api/health`, frontend, and the build-source regression check on the real host. Do not redeploy `37da83f` | B1; enables P2 |
| **P2 — Identity on the real host** (B2, B3) | Configure Supabase Site URL + exact `/synapsehub` redirect to the working origin → one authorized account completes signup/confirm/login/recovery → record results | B2, B3; auth/email → M3 |
| **P3 — Full-stack verification** (B4, B6) | Real-session push/pull/conflict, PDF upload/download/cite/delete against the deployed API; oversize and 100-page cases; container-profile fallback decision | B4, B6; §3.3–3.5 → M3 at the API layer |
| **P4 — Probes and CI truth** (B7) | Set `SYNAPSE_SUPABASE_URL` / `SYNAPSE_SUPABASE_PUBLISHABLE_KEY` / `SYNAPSE_API_ORIGIN` in Actions variables → dispatch `synapsehub-runtime.yml --cloud` → attach run link here | B7; documented live probe evidence |
| **P5 — Abuse and durability decisions** (B5, B11-adjacent) | Choose shared ingress rate limiting (or accept + document); decide object-storage/container profile for originals; record both decisions in the release log | B5; honest release notes |
| **P6 — Inference (optional for beta)** | Operator supplies `OLLAMA_URL` + model → dispatch probes with `--ollama`, then `--ollama --generate` (synthetic fixture) → until then, generation stays disabled and says so | §3.7 → M3, or stays disabled-by-design |
| **P7 — Operational maturity** (B8) | Document + test backup/restore; add minimal operational signals (health deep-check, error logging with correlation IDs) | B8; prerequisites for M5 |
| **P8 — Native artifacts (parallel, non-blocking)** | Set GitHub variables → dispatch `synapsehub-native-release.yml` → download artifacts → simulator/device checks → signing/store only if desired | §3.13 evidence; never blocks the web beta |
| **P9 — Release record** | Update this document's classifications with the new evidence, then write the release notes strictly from what is M3+ here | The honest initial release |

Recurring gate: re-run `infrastructure/supabase/security_checks.sql` against
the live project after any schema or policy change, and keep E1–E7 green on
every commit (CI already runs E1–E5 equivalents in `synapsehub.yml`).

## 7. What this assessment does not claim

- No capability is `verified in production`. Nothing here says otherwise.
- Test counts in §2 were executed in this session; older counts in the logs
  (e.g. "14 backend tests" in the release log) are superseded by the 23 above.
- The live database checks (E9–E13) verify the **database service**, not a user
  journey through the deployed application.
- Vercel deployment state could not be re-verified today (connector access
  denied); "no successful deployment" reflects the last recorded evidence.
- Generation, OCR, embeddings, collaboration and offline sync are absent —
  deliberately, and they stay absent from the release claims.
