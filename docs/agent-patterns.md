# Agent patterns taken from the reference repositories

Tessera is the only product in this repository with an AI surface, and it has
exactly one. This note records where its design came from, what was deliberately
**not** taken, and why the six "agent" repositories on this account are references
rather than dependencies.

## What the six repositories actually are

| Repository | Licence | What it is | Why it is not vendored into a product |
| --- | --- | --- | --- |
| `opencode` | MIT | A terminal coding agent | An end-user CLI. Its value here is architecture: session state, tool-call approval, provider abstraction. Shipping it inside a learning product would mean shipping a coding agent we do not support. |
| `pi` | MIT | A minimal personal agent runtime | Same shape as above, smaller. Useful as a readable example of the agent loop, not a library to embed. |
| `chatwoot` | NOASSERTION | A customer-support suite with AI reply assistance | A complete server product with its own schema, auth and deployment. It cannot be embedded in a Next.js/FastAPI product, and its licence is not stated unambiguously enough to redistribute. |
| `Flowise` | NOASSERTION | A visual LLM-flow builder | A separate service with its own UI and database. Same licensing problem, and its abstraction (visual flows) is the opposite of what a grounded tutor needs (one constrained prompt). |
| `graphify` | Apache-2.0 | Graph extraction / analysis tooling | Relevant *conceptually*: Tessera already has a knowledge graph. It is not a runtime dependency for a learning path, and pulling it in would add a large surface for no learner-visible gain. |
| `ECC` | MIT | Cryptography/engineering tooling | Nothing to do with the learning product. Recorded here so the review is complete, not because it was used. |

None of them is imported, copied, or required at build or run time. No line of
their source is in this repository.

**A correction worth recording.** GitHub's API reports `chatwoot` and `Flowise` as
`NOASSERTION`, which reads like "no licence". Reading the licence files themselves
shows something different and more permissive:

- **Flowise** — Apache-2.0 for everything outside `packages/server/src/enterprise/`
  and files carrying an explicit commercial notice. Apache-2.0 is a real,
  irrevocable grant, including patent terms.
- **Chatwoot** — MIT Expat for everything outside `enterprise/`.
- **opencode**, **pi** — MIT, unmodified.

So the useful parts of all four are legally reusable with attribution, and the
"the owners stopped working on it" argument is not what makes them usable — the
licence is. A maintained licence grant does not expire when a project is
abandoned, and an abandoned project does not become free because nobody is
watching. Both statements are true at once, and only the first one matters.

Vendoring was still the wrong move for a different reason: these are a Rails
helpdesk, a TypeScript flow-builder monorepo, a terminal coding agent and a
personal agent runtime. There is no small piece of them that belongs inside these
products. What follows is therefore independent implementation of the *ideas*,
with the ideas named so the borrowing is auditable.

## The patterns that were adopted, and where they live

The patterns are ordinary and well known; they are listed so the design is
auditable, not to imply a derivation.

| Pattern | Where it appears in Tessera | What it prevents |
| --- | --- | --- |
| One tool that retrieves, one agent that may only use it | `ai/agent.py` — `search_knowledge` is the agent's single tool | A model answering from its own weights and sounding confident |
| Grounding text passed as context, with citations attached | `ai/retrieval.py` → `context_block()` | Unattributable claims; a learner cannot check the source |
| Retrieval that runs without a model | `POST /api/tutor/search` | A key being needed to demonstrate that the content exists |
| Configuration reported honestly instead of assumed | `tutor_config()`, `GET /api/tutor/status` | A chat UI that renders and then fails |
| Per-user session and thread ownership | `ai/store.py` — every read and write is scoped to `owner` | Cross-learner leakage |
| Explicit refusal instead of guessing | `INSTRUCTIONS` in `ai/agent.py` | Invented progress, invented mastery, exam answers |
| Upstream failure surfaced as a failure | `routes.py` → `502 tutor_upstream_failed` | A stack trace, or worse, a fabricated reply |
| Server owns the session identity | `server.process(body, {"owner": …})` | Trusting a client-supplied user id |

## What was taken from each, and where it landed

| Source | Idea | What was built |
| --- | --- | --- |
| **Flowise** | Behaviour as a declared graph, not code buried in a handler | `company-platform/src/content/flows.ts` declares each assistant as ordered nodes (`retrieve → guard → policy → compose → structure`). `src/lib/assistant/flow.ts` executes it and emits a trace. The settings used at request time (retrieval limit, temperature, token cap) are read from those nodes, and the page renders the same flow — so the diagram cannot drift from the behaviour. |
| **Chatwoot** | A conversation ends in a queue a person reads | `support_requests` table, `/api/assistant/<name>/handoff`, and `/admin/support`. Each request carries a short reference (`VLQ-7VKEY4`), the transcript, and a status a person moves. Company scoping is enforced in the query, not the UI. |
| **opencode** | Side-effecting actions need explicit approval | Raising a request requires `confirmed: true`; the server returns 409 without it and creates nothing. The UI asks before it sends. The company is resolved from the assistant, never from the request body, so a visitor cannot file into the other queue. |
| **pi** | A bounded agent loop with a visible trace | Tessera's `app/ai/chat.py` emits `step` events before the text and stops at `MAX_TURNS`, reporting the cut rather than looping. The company platform emits the same shape. Both interfaces show "How this answer was produced" under each answer. |

Two things came out of implementing those rather than out of the source repos:

- **A guard that refuses.** If nothing in an assistant's corpus matches, the flow
  stops at the `guard` node and no model is called at all. The visitor is told
  plainly. This is cheaper and more honest than prompting a model to decline.
- **`grounded` on every Tessera turn.** If the model answers without the retrieval
  tool — the exact failure this tutor exists to prevent — the turn still completes
  but is reported as ungrounded and flagged in the interface. Silence there would
  let an invented answer look sourced.

## What was deliberately rejected

- **Running their agents as ours.** A coding agent in a learning app is a
  different product with a different threat model.
- **A visual flow canvas.** Flowise's canvas is its product. Two assistants with
  five nodes each need a declaration and a readable list, not a graph editor that
  would then have to be maintained.
- **A helpdesk.** Chatwoot is a multi-channel inbox with teams, SLAs and routing.
  What is needed here is one queue per company with a reference and a status.
- **Importing their prompts.** Prompts are the part most likely to be copied
  without a licence and the least likely to fit this curriculum.
- **A per-feature chatbot.** One tutor module serves the whole product; more than
  one would mean more than one set of instructions to keep honest.
- **Vector embeddings.** Retrieval is token overlap: deterministic, explainable,
  and cheap. It is weaker at paraphrase, and the README says so rather than
  describing it as semantic search.

## Status of AI in the other products

No other product in `apps/` has an AI surface implemented. Some have surfaces
where AI is plausible later — the requirement is that each one would reuse
`apps/tessera/backend/app/ai/` as a module with its own grounding corpus, not
that they would each grow a chatbot now. Nothing is stubbed: there is no button
anywhere that claims to be AI and is not wired to something real.

## Why ChatKit was adopted and then dropped

Tessera's first conversation layer was OpenAI's ChatKit, used as a self-hosted
server. It was worth building because it made the protocol obvious: threads,
streamed deltas, citations, structured errors. It was then removed, because the
cost sat in the wrong place:

| Kept | Dropped |
| --- | --- |
| Threads stored server-side, not in the browser | The vendor protocol and its Python server class |
| Token-by-token streaming | An iframe UI served from a third-party CDN, which could not be styled or audited |
| Citations travelling with the answer | A store interface whose async contract we had to bend the database layer into |
| A retryable, structured error event | The dependency itself |

`app/ai/chat.py` and `src/tutor.tsx` now implement those four good ideas over
about a hundred lines each, on any OpenAI-compatible provider. The company
platform's two assistants use the same four events, so the products behave alike
without sharing a vendor.

The one thing that is genuinely unverified is model output quality: no provider
is reachable from this environment, so no live completion has ever been
inspected. The tests cover the boundaries around the model, not the model.


## Second batch: CrewAI, Mastra, LLMs from Scratch

Checked before use, same as the first batch. GitHub reports `NOASSERTION` for two
of the three, which is a statement about the licence *file*, not about the
licence:

| Repo | What the licence file actually says | Reusable? |
| --- | --- | --- |
| CrewAI | MIT (1055 bytes) | Yes, with attribution |
| Mastra | Apache-2.0 everywhere except `ee/` directories, which have their own licence | Yes outside `ee/` |
| LLMs from Scratch | Apache-2.0, with an explicit carve-out: the *book text and images* are excluded from the source-form definition | The code, yes; the book, no |

That last carve-out is worth naming: "Apache-2.0" on that repository does not
cover the book chapters or figures, so nothing from them is reproduced here. The
licence says so itself.

### Adopted

**CrewAI — declared expected output** (`company-platform/src/lib/assistant/flow.ts`).
A CrewAI task states what the finished work should look like, and the work is
checked against that before it is accepted. Applied to a streamed answer: each
flow now declares `minChars`, `maxChars` and whether it must end on an action, and
`checkAnswer()` runs after the stream finishes. A truncated answer used to arrive
looking finished, because "the model returned something" was the only success
condition. `done` now carries `{ ok, problems[] }` and the interface labels the
answer *incomplete* instead of presenting it as an answer.

**LLMs from Scratch — the context window as a budget** (`apps/tessera/backend/app/ai/budget.py`).
One idea, put where a learner can see it: a model reads a fixed window of tokens,
and retrieval competes for it. The tutor now estimates what a turn spends and says
so in its trace — *"Estimated 412 of 8192 tokens … 5% of the window"* — and warns
when less than a quarter is left for the answer itself. The estimate is
approximate (4 characters per token, punctuation counted separately) and is
labelled as an estimate everywhere it appears. No decision depends on it; what it
prevents is the silent case where a long thread crowds out the material that was
supposed to justify the answer.

### Considered and rejected

- **Mastra's agent/workflow DSL.** The pieces worth having — typed tool calls, a
  step trace, provider presets — are already implemented in roughly 250 lines
  here, against our own storage and our own SSE protocol. Adopting it would mean a
  second abstraction over the same three ideas, plus a dependency whose licence is
  split across `ee/` directories. The *provider preset* idea was taken (see
  `PROVIDER_PRESETS` in `apps/tessera/backend/app/ai/agent.py`): a name and a key
  rather than a URL and a model id from memory.
- **Multi-agent crews.** Two single-purpose assistants and one tutor do not need a
  planner/worker/reviewer hierarchy. The failure mode of adding one is a system
  that spends three model calls deciding what to do and one doing it.
- **Training or fine-tuning anything.** "From scratch" material is a teaching aid
  here, not a plan: the weights are somebody else's, served over an
  OpenAI-compatible endpoint, and that is stated rather than dressed up.


## Third batch: the agent-skill repositories

Four repositories forked on the day this was written were read for *method*, not
for code: `paperclip` (`.agents/skills`), `hyperframes` (`.agents/skills`),
`claude-plugins-official` and `awesome-agent-skills`. Nothing is vendored and no
licence is relied on beyond reading; what follows is what changed as a result,
with the evidence, because "we adopted a skill" without a diff is a claim.

### `fix-slow-queries` → the daily plan no longer costs a query per concept

The skill's rule: *"A list of suspicious SQL or an unverified rewrite is an
intermediate result."* Baseline first, then treatment, then proof that behaviour
did not move.

Measured on this machine, one learner, 200 concepts:

| | queries | time |
| --- | --- | --- |
| `all_signals`, before (one loop over 200 concepts) | **1200** | **299 ms** |
| `all_signals`, after (`signals_bulk`) | **4** | **14 ms** |

`tests/test_signals_bulk.py` pins two things the skill insists on: the bulk path
returns *equal* `ConceptSignal` objects to the per-concept path (behaviour proof),
and the query count does not move when twenty more concepts are added (budget
proof). A rewrite that only had the first would grow back; one that only had the
second could be fast and wrong.

The same discipline applied before it was written: the new review queue was built
bulk-first and measured at 4 queries for 50 due items, rather than optimised after
it shipped slow.

### `test-audit` → two of my own new tests were asserting through the database

The skill's decision gate asks which observable contract a test covers and whether
it reaches the code responsible. Applying it to the stage-3 tests found:

- a cloze test that rebuilt the expected answer by querying the database and
  calling a private helper, duplicating the grading logic it was meant to check.
  Rewritten to answer once through the API, read the revealed term from the
  response, and answer again — the production path end to end;
- an assertion that only checked a mock had been called, with nothing about what
  the learner sees. Strengthened to assert the confirmation text ("the row is kept
  in the history"), which is the promise the append-only rule makes;
- a test whose premise was wrong: it asserted that a self-graded attempt grows
  stability less, using `elapsed_days=0` — where *no* attempt grows stability,
  because no forgetting was observed. The test passed or failed for a reason
  unrelated to the claim. Fixed to compare at a point where forgetting exists, and
  the underlying property now has its own test.

Retained after review, as the skill allows: the profile test that asserts the
request arguments of "retire an assessment" covers a real regression (a missing or
wrong id, an untrimmed reason) that the rendering tests cannot see.

### `add-product-e2e-eval` → the scheduler is graded against a control that fails

The skill's rule: *"Calibrate new grading assertions with a valid outcome and a
plausible wrong outcome; missing evidence must not produce a pass."*

`app/evals/recall_eval.py` simulates learners with a **different** forgetting model
from the one the scheduler uses (exponential decay with per-item half-lives and
noisy outcomes, versus the scheduler's power curve), gives every strategy the same
review allowance, and reports retention:

```
strategy    recall  reviews  per item
tessera      0.756     2200      11.0
fixed_7      0.430     2200      11.0
broken       0.073      200       1.0
```

`broken` schedules ninety days regardless of outcome and **must fail** the
threshold the real scheduler passes — a metric that cannot fail is a screenshot.
The ordering is required at two different seeds so one lucky draw cannot carry the
claim, and a strategy with no probes scores zero rather than passing by default.

### `hyperframes/motion-doctrine` → the working screens stopped moving for no reason

The doctrine's rule that transfers from video to UI: *motion must perform, not
breathe* — no idle wobble. Applied to the new screens:

- the review screen's only animation is a progress bar whose width changes when an
  answer is recorded, and which is a `progressbar` with `aria-valuenow` so the
  information is not carried by the movement alone;
- the library and review screens have no ambient motion at all;
- the profile header keeps its slow drift, deliberately, because that screen is a
  brand surface and the brief asked for it — an exception that is written down
  here rather than left implicit;
- everything remains off under `prefers-reduced-motion`.

### `maintain-verification-skill` → the repository now carries its own verification

`.agents/skills/verify-tessera/SKILL.md` states the commands that reproduce every
claim in the Tessera README, what each should print, and — the part that matters —
what it does **not** verify (no live PostgreSQL, no provider ever reached, a
simulator is not a learner). The numbers in it are the ones this session actually
produced.
