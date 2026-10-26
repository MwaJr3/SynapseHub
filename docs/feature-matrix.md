# Engineering Feature Matrix — Modern Feature Candidate Pass (Phase B)

Governance table for the 25 engineering-catalogue applications, per the
feature-candidate prompt (supplied in `modern_feature_performance_master_prompt.md`;
its §12 matrix columns and §13 definition-of-done shape this document).
Feature candidates were **prioritized, not implemented blindly** (§ rules):
P0 correctness/safety first; deferred candidates carry explicit reasons.
Sources cited in the prompt's bibliography (§14 — Python docs profiling/
tracemalloc, MDN, Core Web Vitals, FSRS, OWASP Top 10:2025/ASVS, WCAG 2.2)
were **prompt-supplied guidance, not pages fetched in this environment**.

Legend: **Shipped** = implemented + tested · **Deferred** = documented reason
· **Pre-existing** = present before this pass (retained per §24).

| # | App | Candidate features (from prompt §2) | Status | Performance/DSA note | Deferred with reason |
|---|-----|--------------------------------------|--------|----------------------|----------------------|
| 1 | passforge | presets, property explanations, vetted passphrases, no logging | Shipped (presets `75001c6`+amend; properties; passphrases pre-existing) | CSPRNG sampling O(len); policy check O(len) | site-rule adapters (no rule corpora); breach checks (network) |
| 2 | gradeflow | weights, what-if calculator, boundary validation | Shipped (`75001c6`) | what-if closed form O(1); weights O(n) | SIS/LMS imports (vendor APIs); curve automation (policy) |
| 3 | budgetbook | budgets/indicators, recurring templates w/ review, CSV import w/ duplicate warnings | Shipped (indicators pre-existing; CSV+templates `75001c6`) | row-hash dupes O(n) expected; materialization bounded 365 | bank dialect detection (would corrupt rows); auto-rollover (policy) |
| 4 | guessmaster | adaptive difficulty, seeded daily challenge, streaks | Shipped (`273dd5b`) | seeds O(1); streak O(d) | online leaderboards (hosting); cosmetics (content design) |
| 5 | quizbox | review w/ explanations, confidence vs score, bank import/export validation | Shipped (`273dd5b`) | review/calibration O(n) | adaptive selection (no validated item-difficulty model) |
| 6 | taskdeck | recurring, subtasks/dependencies w/ cycle detection, saved filters, focus view | Shipped (filters pre-existing; recur/cycles/focus `81644a2`) | cycle DFS O(V+E); focus O(n log n) | calendar sync (external services); auto-posting (policy) |
| 7 | campusflow | self-service, prerequisites/waitlists/clashes, dashboards, audit trails, role-based reports | Shipped (audit+RBAC pre-existing; prereqs/waitlists/clashes/dashboard `a1e1fa1`) | set-diff O(p); clashes O(e²) bounded; FIFO O(1) | auto waitlist promotion (policy); self-service UI surfaces (API-complete, frontend follow-up) |
| 8 | shelfwise | holds/waiting lists, title vs copy separation, overdue/extension reports | Shipped (`deeda07`) | FIFO O(1); overdue scan O(loans) | barcode/ISBN lookup (external data); fines (policy varies) |
| 9 | unicore | prerequisites, capacity/waitlists, clash detection, audit logs, transcript export | Shipped (`2e2e6ec`) | clashes O(e²) bounded; audit append O(1) | SIS integration (vendor APIs); auto waitlist promotion (policy) |
| 10 | flashkit | scheduler evidence check, cloze, tags, difficult-cards session | Shipped (`deeda07`; scheduler labelled **SM-2-style, NOT FSRS**) | difficult-session sort O(n log n) | FSRS adoption (must verify implementation first); media cards (pipeline) |
| 11 | tidyfiles | rule profiles, undo manifest, size-first duplicate filter, never auto-delete | Shipped (`2e2e6ec`; never-delete tested) | size grouping O(n); hash only within equal-size groups | content-aware classification (models); scheduled auto-tidy (conflicts with never-delete) |
| 12 | chessscope | opening identification/filters, exportable study reports, training queue | Pre-existing (all four verified present in backend/frontend) | — | — |
| 13 | circuitlab-calc | unit-aware I/O, solve-for-unknown, divider, tolerance sensitivity, reproducible reports | Shipped (4 pre-existing; tolerance sensitivity `a1e1fa1`) | sensitivity table O(k); worst-case exact bounds | Monte-Carlo (bounds exact suffice); tolerance-panel UI (API-complete, frontend follow-up) |
| 14 | notekit | backlinks, graph (bounded expansion), duplicate detection, markdown import/export | Shipped (`5e22bcd`+amend) | BFS bounded depth≤4/nodes≤200; Jaccard O(n²) w/ pre-filter | embedding similarity (model needed); realtime co-editing (infra) |
| 15 | skycast | hourly/multi-day, favourites/units, TTL cache w/ freshness labels, stale warnings | Shipped (TTL/stale/favourites pre-existing; hourly+units `5e22bcd`) | conversions O(1); hourly slice O(n) | map views (assets); push alerts (notification infra) |
| 16 | quizarena | shuffling, leaderboards, import/export validation, moderation | Shipped (built in at `bf6e207`) | Fisher–Yates O(n); leaderboard single GROUP BY | LMS integrations; live co-editing |
| 17 | prepwise | filters, mock timer, spaced review, self-assessment honesty | Shipped (built in at `ad1d62f`) | filter query O(k); schedule single-row writes | voice/video interviews; real corpora |
| 18 | shopdeck | order/inventory state machines, pricing audit, data-quality-flagged reports | Shipped (built in at `c3cbba3`) | transitions O(1); report single JOIN | payment providers; tax/shipping logic |
| 19 | webwatch | collection policy, change detection, provenance, bounded retrieval | Shipped (built in at `615b314`) | hash dedupe O(1) avg; bounded pages | scheduled runs (observability infra); third-party connectors |
| 20 | creadesk | review workflow, scheduling, validation gates, link allowlist | Shipped (built in at `ab163b9`) | transitions O(1); diffs O(v) | notifications (external services); auto-publish (policy) |
| 21 | simforge | bounded sweeps, convergence checks, sensitivity, reproducible exports | Shipped (built in at `49e3e32`) | sweeps ≤1000; networks ≤64 | 3D visualization (assets); solver scaling studies |
| 22 | wattwise | estimator w/ assumptions, baseline comparison, windows, confidence | Shipped (built in at `48f3d77`) | rolling means O(n) | ML forecasting (validated model needed); live meter adapters |
| 23 | docsage | citations/allowlist, review status, version diffs, offline ranked search | Shipped (built in at `eac4c78`) | TF-IDF build O(tokens); search sparse accumulation | embedding retrieval (optional adapter); real auth (demo roles) |
| 24 | datadesk | profiling/quality warnings, recipes, reversible transforms, bounded preview | Shipped (pre-existing partial + `5e22bcd`) | profiling O(n); undo O(1)/column | statistical outlier detection (domain thresholds); auto type-inference (corruption risk) |
| 25 | stockmate | immutable ledger, roles, reorder alerts, labelled estimates | Shipped (built in at `0196abb`) | ledger append O(1); valuation scan O(n) | FIFO lot costing; multi-location |

## Cross-cutting engineering rules applied
- **P0 correctness/safety first**: refusals over guesses everywhere (negative
  stock, illegal transitions, unallowlisted URLs, overwrites, unbounded
  expansions).
- **Measure before/after** for performance-relevant work: complexity notes
  accompany each feature; no benchmark numbers are claimed that were not
  measured in this environment (none were).
- **No invented claims**: scheduler is SM-2-style (not FSRS); ML outputs and
  demand/plan figures are labelled estimates; simulated/demo data labelled.
- **Preserve existing work** (prompt §24): feature passes extend cores; no
  rebuilt apps.
