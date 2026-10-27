# Study planner ↔ Tessera: consent model and API contract

**Status:** implemented and tested on the Tessera side; wired on the planner side and
unit-tested there. Not yet exercised end-to-end across two running deployments, and
not yet run against PostgreSQL in this environment. Sections marked **Blocker** and
**Not verified** say so explicitly.

Stage 5, workstream A. The question this answers: how can the Tamuzi study planner
know what a learner is working on without becoming a second owner of their record?

## 1. The decision

**User-authorized, read-only, time-limited access — not a shared database, not a
shared session.**

| Option | Why it was rejected |
| --- | --- |
| Share the Tessera session cookie | Two origins cannot read each other's cookies; copying one would hand the planner the learner's full account, including writes. Explicitly forbidden by the brief. |
| Ask the learner for their Tessera password | Turns the planner into a credential thief and makes every password breach a second breach. Explicitly forbidden. |
| A service account that reads everyone | One compromised key exposes every learner. Violates least privilege and the platform's per-learner isolation rule. |
| **A learner-granted scope, exchanged for a short-lived token** | The planner gets exactly one permission, for one learner, for one hour, and the learner can end it from either side. |

Tessera is the authorization server *and* the resource server. The study planner is
a confidential client registered in Tessera's configuration.

## 2. Data minimisation: what the summary contains, and from where

Every field maps to an existing table. Nothing is invented, and nothing that exists
is included merely because it is available.

| Summary field | Source | Why the planner needs it |
| --- | --- | --- |
| `learning_objectives[]` (`id`, `title`, `concept_count`, `created_at`) | `goals` (`Goal.title`, `Goal.concept_ids`) | A week has to serve the goals the learner set. |
| `progress.concepts_tracked` | count of `concept_states` for the learner | Scale of the current workload. |
| `progress.concepts_reviewed` | `concept_states` with `reps > 0` | Distinguishes "not started" from "studied once". |
| `progress.average_mastery` | mean `concept_states.mastery` over reviewed concepts, `null` if none | A single honest number; `null` rather than `0` when there is no evidence. |
| `progress.retrieval_attempts` | count of `retrieval_attempts` | Effort spent, not just outcomes. |
| `progress.last_activity_at` | max `concept_states.last_reviewed_at` | "Is this data current?" |
| `outstanding_activities[]` | `concept_states` where `next_review_at <= now`, with `Concept.title` | What is due, so the week can place it. |
| `strengths[]`, `needs_attention[]` | the highest and lowest `mastery` among **reviewed** concepts | Where to spend time. Concepts with no evidence are excluded — see §3. |
| `updated_at` | the same `last_activity_at` | Shown as "Tessera updated …". |
| `generated_at` | server clock at request time | Lets the planner distinguish stale cached data from fresh. |

**Deliberately excluded and enforced by a test:** email address, display name,
password hash, session tokens, reference notes, tutor conversations, raw answers,
assessment scores, and chess attempts. A planner needs the shape of the work, not
the learner's file.

## 3. Missing stays missing

A concept the learner has never reviewed is **not** weak; it is unmeasured. So:

* `needs_attention` and `strengths` only contain concepts with `reps > 0`;
* `average_mastery` is `null` when nothing has been reviewed, never `0`;
* the planner shows "not measured yet" and "No evidence has been recorded yet, so
  strengths and gaps are left blank rather than guessed."

`test_missing_data_stays_missing` pins this behaviour.

## 4. The consent record

One row in `consent_grants` per (learner, client). The row is kept after revocation.

| Field | Purpose |
| --- | --- |
| `user_id` | The learner who granted. Foreign key to `users`, cascade on delete. |
| `client_id` | The application. Foreign key to `oauth_clients`. |
| `scopes` | Exactly what was granted — currently always `["learning-summary:read"]`. |
| `purpose` | The sentence shown on the consent screen, stored verbatim. If the wording changes, the old grant still says what was agreed at the time. |
| `granted_at` | When. Re-granting after a revocation updates this and clears `revoked_at`. |
| `revoked_at` | Set, never deleted, so "was access ever granted" survives withdrawal. |
| `expires_at` | Supported and nullable. `CONSENT_TTL = None` in this build: the grant lives until revoked. |
| `last_used_at` | Updated on token issue and on each successful summary read, so a settings screen can show real activity. |

Related tables:

* `authorization_codes` — one-time, 5-minute, PKCE-bound, **stored as SHA-256**.
* `access_tokens` — one-hour bearer token, **stored as SHA-256**, scoped, revocable,
  with `last_used_at`.

### Lifecycle

```
learner signs in to Tessera
      │
GET  /api/v1/oauth/consent?client_id&redirect_uri&scope      → preview copy
POST /api/v1/oauth/authorize {decision: grant|deny}          → redirect_url
      │                                                     (code, or error=access_denied)
POST /api/v1/oauth/token {code, code_verifier}               → access_token (1 h)
GET  /api/v1/me/learning-summary   Authorization: Bearer …   → summary
POST /api/v1/oauth/revoke {token}   (planner-initiated)
DELETE /api/v1/me/consents/{client_id}   (learner-initiated, in Tessera)
```

Revocation kills **every** token for that client immediately. A code replay is
treated as a leak: the code is marked used and the grant's tokens are revoked.

## 5. API contract

### `GET /api/v1/oauth/consent` — session cookie required

```json
{
  "client": { "id": "tamuzi-study-planner", "name": "Tamuzi Study Planner" },
  "redirect_uri": "https://planner.example.com/api/tessera/callback",
  "scopes": ["learning-summary:read"],
  "purpose": "Retrieve a read-only summary of your learning progress …",
  "already_granted": false,
  "can_write": false,
  "revocable": true
}
```

`401` when there is no Tessera session. The copy is returned by the server so that
what is displayed and what is stored cannot drift.

### `POST /api/v1/oauth/authorize` — session cookie required

```json
{
  "client_id": "tamuzi-study-planner",
  "redirect_uri": "https://planner.example.com/api/tessera/callback",
  "scope": "learning-summary:read",
  "state": "…",
  "code_challenge": "…",
  "code_challenge_method": "S256",
  "decision": "grant"
}
```

→ `200 {"redirect_url": "https://planner…/callback?state=…&code=…"}`

Validation, each with its own test: `redirect_uri` must exactly match a registered
entry; scope must be supported *and* allowed for that client; `code_challenge_method`
must be `S256` (`plain` refused); `state` is echoed untouched and never interpreted.

Errors: `400 invalid_client` · `400 invalid_request` · `400 invalid_scope` ·
`401` (no session).

### `POST /api/v1/oauth/token` — public, PKCE-protected

```json
{ "grant_type": "authorization_code", "code": "…", "client_id": "…",
  "redirect_uri": "…", "code_verifier": "…" }
```

→ `200 {"access_token": "…", "token_type": "Bearer", "expires_in": 3600, "scope": "learning-summary:read"}`

`400 invalid_grant` for: unknown code, wrong client, used code, expired code, changed
`redirect_uri`, failed PKCE. No refresh token is issued — a planner that needs data
again asks the learner to reconnect, which keeps the consent visible.

### `GET /api/v1/me/learning-summary` — `Authorization: Bearer <token>`

Identity is derived **only** from the token. There is no learner-id parameter; a
`user_id` query parameter is ignored (tested).

```json
{
  "learning_objectives": [{ "id": "…", "title": "Learn recursion", "concept_count": 0, "created_at": "…" }],
  "progress": { "concepts_tracked": 0, "concepts_reviewed": 0, "average_mastery": null,
                "retrieval_attempts": 0, "last_activity_at": null },
  "outstanding_activities": [],
  "strengths": [],
  "needs_attention": [],
  "updated_at": null,
  "generated_at": "2026-10-27T18:00:00Z",
  "source": "tessera",
  "scope": "learning-summary:read"
}
```

Errors: `401 invalid_token` (missing, unknown, expired, revoked, or consent
withdrawn) · `403 insufficient_scope`. **`405` for every write method** — there is no
write route, so this is a property of the router, not a check inside a handler.

### `GET /api/v1/me/consents` · `DELETE /api/v1/me/consents/{client_id}` — session

Lists active connections for the settings screen and withdraws one. `DELETE` returns
`{"client_id": "…", "revoked_tokens": n}`.

### `POST /api/v1/oauth/revoke` — public

Accepts `{"token": "…"}`. Always `200`, whether or not the token existed: a
distinguishable answer would be an oracle for guessing tokens.

## 6. Trust boundaries and token handling

```
Learner's browser ──session cookie──▶ Tessera            (Tessera's origin only)
Learner's browser ──top-level nav──▶ Tessera consent page
Tessera ──302 with code──▶ planner /api/tessera/callback
planner server ──POST code+verifier──▶ Tessera /oauth/token
planner server ──GET Bearer token──▶ Tessera /me/learning-summary
```

* The planner never sees the learner's Tessera password or session cookie. Its
  `/api/tessera/callback` receives a code, once, in a redirect.
* The PKCE verifier and the access token live in **httpOnly, SameSite=Lax, Secure
  (production) cookies on the planner's own origin** — never in `localStorage`, never
  in a URL, never in a log line.
* The verifier is created per attempt and cleared on return; `state` is compared
  before the code is exchanged.
* Codes and tokens are stored **hashed** in Tessera. A database dump does not
  contain a usable credential.
* The planner sends the token in an `Authorization` header only. A unit test asserts
  the URL never contains it.
* The scope is checked on the server for every request; the planner's UI hiding an
  edit button is not the control.
* **Blocker (deployment):** the connection requires HTTPS on both sides. `Secure`
  cookies are on in production; a plain-HTTP deployment outside localhost will not
  hold the token.

## 7. Configuration

Tessera (`apps/tessera/backend`):

```bash
TESSERA_PLANNER_CLIENT_ID=tamuzi-study-planner
TESSERA_PLANNER_CLIENT_NAME=Tamuzi Study Planner
TESSERA_PLANNER_REDIRECT_URIS=https://planner.example.com/api/tessera/callback
```

The client is registered at startup from these values. There is no endpoint that
creates clients: a third party cannot register itself and then ask for a grant.
Registration is skipped with a warning when the integration tables have not been
migrated (`alembic upgrade head` creates them).

Study planner (`company-platform`):

```bash
TESSERA_BASE_URL=https://tessera.example.com
TESSERA_PLANNER_CLIENT_ID=tamuzi-study-planner
TESSERA_PLANNER_REDIRECT_URI=https://planner.example.com/api/tessera/callback
```

All three or nothing: with any missing, the planner shows "Tessera is not connected
in this deployment" and continues.

## 8. When Tessera is unavailable

The planner's core function is planning from published principles. That is not
served by Tessera and does not depend on it:

| Failure | Planner behaviour |
| --- | --- |
| Not configured | Panel says the deployment has no connection; planning works. |
| Not connected | Panel offers Connect; planning works. |
| Token expired / consent revoked | Panel says "expired or disconnected in Tessera", offers Reconnect, deletes the local credential. |
| Network failure or 5 s timeout | "Tessera could not be reached just now. Planning continues without progress data; nothing has been changed in either product." |
| 500 from Tessera | Same as network failure. |

There is no cached summary: a stale progress grid would be a quiet lie about
"last refreshed". The panel always shows the fetch time when it does show data.

## 9. Acceptance criteria and the test that proves each

| Criterion | Proof |
| --- | --- |
| Learner can connect, decline, disconnect | `test_granting_returns_a_code…`, `test_declining_returns_access_denied…`, `test_disconnecting_revokes_access_immediately`, `test_a_second_visit_reports_that_access_is_already_granted` |
| Without consent, no summary | `test_the_consent_screen_requires_a_signed_in_learner` (401), `test_a_missing_or_forged_token_is_unauthorised`, `test_a_token_without_the_scope_is_forbidden` |
| A learner cannot read another's data | `test_the_summary_is_this_learners_and_no_one_elses` (two learners, two objectives, plus an ignored `user_id` parameter) |
| The integration cannot write | `test_there_is_no_write_path_on_the_summary` (405 on POST/PUT/DELETE, and no concept-state rows created by three reads) |
| Expired or revoked authorization is rejected | `test_an_expired_code_is_refused`, `test_an_expired_token_is_rejected`, `test_disconnecting_revokes_access_immediately`, `test_a_revoked_token_cannot_be_repossessed` |
| Tessera being down does not break the planner | `tests/tessera-integration.test.ts` — "treats a network failure as unavailable, not as empty data"; the planner page never gates on this panel |
| The interface shows when the summary was last refreshed | `TesseraConnection` renders `fetchedAt` and `updated_at`; asserted in the client test for an honest `fetchedAt` |
| Automated tests cover authorization, isolation, revocation and failure | 21 backend tests + 16 planner tests, listed above |

Backend: **329 passed, 7 skipped** (the skipped ones require a live PostgreSQL; see
§10). Planner: **138 passed**; typecheck clean on both.

## 10. Not verified, and remaining blockers

* **PostgreSQL was not available in this environment.** The migration is included and
  `alembic check` reports no drift against the models, but the upgrade has only been
  executed on SQLite here. `test_migrations.py` renders the PostgreSQL DDL offline;
  the 7 skipped SQLite/PG parity tests need `TEST_POSTGRES_URL`.
* **No end-to-end run across two live deployments.** Each half is tested against its
  own contract; the redirect between them has not been walked in a browser here.
  The next step is a compose stack with both apps, `alembic upgrade head`, one
  registered redirect, and a recorded login → Connect → summary → Disconnect run.
* **Consent copy is English only**, and lives in `integration.PURPOSE` because it is
  the string stored on the grant.
* **No refresh tokens, by design.** A planner session longer than an hour asks the
  learner to reconnect. If that proves annoying, the honest fix is a longer
  `TOKEN_TTL` and a test, not a hidden refresh that outlives the visible consent.
* **`CONSENT_TTL` is `None`.** The column exists; choosing a policy is a product
  decision, not a code change.
