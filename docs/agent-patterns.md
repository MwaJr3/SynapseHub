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

## What was deliberately rejected

- **Running their agents as ours.** A coding agent in a learning app is a
  different product with a different threat model.
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
