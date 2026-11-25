# Repository extraction map

**Status:** inventory complete — no extraction executed.
**Scanned:** 2026-11-25, branch `arena/03316780-synapsehub`, base commit `a9c01c7`
(the `Dev` head containing the production-readiness assessment).
**Method:** direct source scan — package boundaries, cross-directory imports,
workspace configuration, CI path triggers, and shared-script consumers. Every
path and coupling below was verified in this session; example commands use
those verified paths.

This map answers one question per project: **can it move to its own repository
without breaking anything that lives here?** It is the prerequisite deliverable
before any extraction, per the multi-repository direction: major applications
become independent repositories, small catalogue projects stay grouped, and
SynapseHub remains the governance repository (registry, docs, contracts,
repo-wide CI).

---

## 1. Verdict summary

| Group | Projects | Verdict |
| --- | --- | --- |
| **Extract-ready now** | `contextvault/`, `workniche/`, `vocal-separator/`† | Zero code imports outside their directory; complete build/test/deploy boundaries |
| **Extract after one preparation step** | `company-platform/`† | Code-clean, but its tests assert `challenges/` exists in-repo (string coupling, enforced by `tests/evidence-paths.test.ts`) |
| **Extract only after a root-SPA split** | SynapseHub Connected (`src/features/synapsehub/`, `backend/`, `api/`, `native/`, `packages/synapse-client/`) | Lives *inside* the root package with the portfolio, challenges and Personal OS; native code imports `packages/synapse-client` by relative path |
| **Keep grouped (extract on release need)** | Tessera, TranscriptWise, ChessScope + the other 40 company apps | Self-contained at runtime; coupled only to central *governance* (workspace toolchain, decor sync, registry), not to sibling code |
| **Keep central** | `projects.json` + `scripts/build-registry.mjs`, `docs/`, `scripts/sync-decor.mjs`, `tools/northstar/`, root portfolio, `challenges/`, root Playwright suite, `.github/workflows/` | Ecosystem governance and shared tooling — this repository's reason to exist after extraction |
| **Not applicable** | `coursework/`, `sites/archive/`, `prototypes/`, stock-analysis projects with their own CI | Scratch/coursework (already registry-excluded) or already independently CI'd catalogue items |

† One caveat each — see §3.

**Headline coupling finding:** at runtime, this repository is *far more
decoupled than it looks*. No flagship application imports a sibling
application. The real couplings are (a) the root SPA package, (b) one shared
client package imported by relative path, (c) a copy-synced UI kit, and
(d) registry/CI governance tests. Those four are what an extraction sequence
must handle.

---

## 2. Verified inventory

### 2.1 Build boundaries (own `package.json` / Python root)

| Boundary | Kind | Own CI workflow | Notes |
| --- | --- | --- | --- |
| `/` (root) | Vite SPA + Playwright + scripts | `synapsehub.yml` (path-filtered), `e2e.yml`, `ux-quality.yml` | Contains portfolio, `src/features/synapsehub`, `src/features/personal-os`, `challenges/` alias |
| `challenges/` | own package | — (rendered by root) | Self-contained; extraction prepared on `split/challenges` branch (see `docs/branch-splits.md`) |
| `companies/package.json` | npm workspace `*/*/frontend` | — | **Toolchain hoisting only** — "each is self-contained" (its own description) |
| `contextvault/` | Next.js + Playwright + Vitest + Docker + workers | **`contextvault.yml`** (path-filtered on `contextvault/**`) | Complete product boundary |
| `vocal-separator/` | FastAPI backend + Vite web + Docker Compose + own docs | — (root `e2e.yml` covers it — see §3.1) | Complete product boundary |
| `workniche/` | Next.js + Drizzle + Vitest | — | Complete product boundary |
| `company-platform/` | Next.js + Drizzle + Vitest + own `vercel.json` | — | String coupling to `challenges/` (§3.2) |
| `sites/portfolio/` | Vite SPA (second portfolio) | — | Subject of the separate portfolio-consolidation decision |
| `native/mobile`, `native/desktop` | Expo / Tauri | `synapsehub.yml` jobs, `synapsehub-native-release.yml` | Part of SynapseHub Connected |
| `tools/northstar/` | Node CLI (`bin: northstar`) | `ux-quality.yml` (runs `northstar audit .` repo-wide) | By design: "no website embeds it, no project imports it" |
| `tools/synapsehub-smoke/` | Playwright harness | — | Targets a running root dev server |
| 14 Velaqori + 13 Tamuzi `frontend/` | Vite/React (workspace members) | — | Python backends have their own `requirements.txt` each |

### 2.2 Cross-boundary references found (complete list)

| # | From | To | Kind | Extraction impact |
| --- | --- | --- | --- | --- |
| 1 | `src/**` (root) | `challenges/src` | **Code import** via `@challenges` alias (`vite.config.ts`, `tsconfig.json`) | Blocks extracting `challenges/` while root still renders it; blocks root-SPA split |
| 2 | `native/mobile/App.tsx` | `packages/synapse-client` | **Code import**, relative path `../../packages/synapse-client` | SynapseHub Connected extraction must take `packages/synapse-client` along (or publish it) |
| 3 | `src/features/synapsehub/*` | `packages/synapse-client` | **Code import**, relative path | Same as #2 |
| 4 | `e2e/vocal-separator-visual.spec.ts` + `playwright.config.ts` (webServer `npm run preview --prefix vocal-separator/web`, port 4174) | `vocal-separator/` | **Test/CI dependency** | Move the spec with the app; remove the VOCAL webServer block from root config |
| 5 | `company-platform/tests/evidence-paths.test.ts` | `challenges/` (via `inRepoPath` strings) | **String-level assertion** (fails if the named path disappears) | Decide whether the claim check moves or is rewritten before removing `challenges/` |
| 6 | Every app with `src/decor/` (28 copies: 27 company frontends + `company-platform`) | `packages/decor` | **Copy-sync**, not import — `scripts/sync-decor.mjs` copies; `packages/decor/sync.test.ts` fails on drift | No runtime coupling. Before extracting an app: run sync once so the copy is current, then freeze it in the new repo |
| 7 | `src/registry.test.ts` (root suite) | `companies/velaqori`, `companies/tamuzi` trees + every `projects.json` path | **Governance test** — walks the tree, validates registry paths and structure | Any extraction that removes a directory must update `projects.json` **and** this test's expectations in the same change |
| 8 | `projects.json` + `scripts/build-registry.mjs` (`npm run registry`, `--check` staleness) | every project directory | **Registry** — `path` must exist on disk | Registry schema needs an external-repository form before the first directory leaves (§6) |
| 9 | `ux-quality.yml` → `tools/northstar` | repo-wide | **CI tooling** | Stays central; per-app repos can adopt the CLI later as a versioned dependency |

Everything else — `contextvault`, `workniche`, `vocal-separator` sources,
all company app frontends/backs, `sites/portfolio` — was scanned for
`../../../`-style escapes and repo-root references: **none found**.
Python side: `backend/synapsehub` imports only stdlib/framework/`ollama`
(from its own requirements); company backends each pin their own
`requirements.txt`. No shared Python module exists anywhere.

---

## 3. The two caveats that change pilot selection

### 3.1 `vocal-separator` is code-clean but test-coupled

Zero source imports leave the directory; it ships its own Docker Compose,
`.env.example` and docs. However the **root** Playwright suite starts its web
preview and owns its visual-regression baselines (`e2e/vocal-separator-visual.spec.ts`,
`playwright.config.ts:49`). Extracting it therefore requires relocating that
spec (and its snapshot folder) in the same operation — a small but real piece
of cross-repo test ownership.

### 3.2 `company-platform` is code-clean but assertion-coupled

Its evidence test asserts that paths named in `src/content/evidence.ts`
(including `challenges`) exist **in this repository**. That is a governance
claim, not an import — but it will fail the moment those directories move.

### 3.3 Consequence: the recommended pilot is `contextvault`, not `vocal-separator`

`contextvault` has **all three** properties nothing else has:

1. zero couplings of any kind (code, test, or assertion),
2. its own path-filtered CI workflow (`contextvault.yml`) that moves with it,
3. a complete independent verification story (Vitest + Playwright + Docker +
   `workers/`).

`vocal-separator` remains an excellent **second** extraction, after the e2e
ownership question (§3.1) is settled. This refines the earlier suggestion of
leading with Vocal Separator: the boundary is equally clean, but the test
ownership makes it a worse *first* rehearsal of the process.

---

## 4. Classification

### 4.1 Extract-ready now (ordered)

| # | Project | Verified path | Command sketch (history-preserving) | Also move |
| --- | --- | --- | --- | --- |
| 1 | **ContextVault** (pilot) | `contextvault/` | `git filter-repo --path contextvault/` → see note below | `.github/workflows/contextvault.yml` |
| 2 | **Vocal Separator** | `vocal-separator/` | `git filter-repo --path vocal-separator/` | `e2e/vocal-separator-visual.spec.ts` + snapshots; strip VOCAL block from root `playwright.config.ts` |
| 3 | **WorkNiche** | `workniche/` | `git filter-repo --path workniche/` | — |
| 4 | **Company Platform** | `company-platform/` | `git filter-repo --path company-platform/` | resolve §3.2 claim check first |

> The pilot command, spelled correctly: `git filter-repo --path contextvault/ --path .github/workflows/contextvault.yml`
> (note: `contextvault` lives at the repository root — earlier example commands
> placing it under `companies/velaqori/contextvault` do not match this tree).
> `git subtree split --prefix=contextvault -b contextvault-extract` is the
> alternative when a linear partial history is preferred; both were reviewed
> against the real paths here, not assumed.

### 4.2 Extract on independent-release need (company apps)

Tessera (`companies/tamuzi/tessera`), TranscriptWise
(`companies/tamuzi/transcriptwise`), ChessScope
(`companies/velaqori/chessscope`), and the remaining Velaqori/Tamuzi apps.
Each is already a clean directory with its own frontend package and Python
backend. Preconditions before any individual move:

- run `node scripts/sync-decor.mjs` so the local `src/decor` copy is current
  (the copy then travels with the app — no runtime dependency remains);
- remove it from the `companies/package.json` workspace glob (or delete the
  workspace once its last member leaves);
- update `projects.json` + `src/registry.test.ts` per §6.

The ~25 small CLI catalogue tools follow the same rule and should **stay
grouped** — dozens of repositories would replace one organizational problem
with many.

### 4.3 Keep central

- **Registry & governance:** `projects.json`, `scripts/build-registry.mjs`,
  `scripts/build-catalogue.mjs`, `src/registry.test.ts`
- **Shared code:** `packages/decor` + `scripts/sync-decor.mjs` (until reuse
  across *separate* repositories justifies a versioned package),
  `packages/synapse-client` (until SynapseHub Connected moves, §4.4)
- **Tooling:** `tools/northstar` (repo-wide QA engine by design),
  `tools/synapsehub-smoke` (until Connected moves)
- **Docs & assessments:** `docs/` including the production-readiness
  assessment and this map
- **Root portfolio + `challenges/` + Personal OS** — one package today;
  their fate follows the separate canonical-portfolio decision, not this map

### 4.4 Extract last: SynapseHub Connected

Not a candidate until the root SPA is split, because it shares one package
with the portfolio, `challenges/` and Personal OS, and because
`native/mobile` imports `packages/synapse-client` by relative path. The
extraction sequence for Connected is therefore: canonical-portfolio decision →
root-SPA split → take `backend/`, `api/`, `native/`, `packages/synapse-client/`
and `tools/synapsehub-smoke/` together → re-point `synapsehub.yml` path
filters. Attempting it earlier would drag the portfolio along with it.

---

## 5. What does not migrate automatically

Neither `filter-repo` nor `subtree split` carries any of the following; each
needs an explicit owner in the migration plan:

- **GitHub:** issues/PR history outside the moved paths, Actions variables and
  secrets (e.g. `SYNAPSE_*`), branch protection, workflow permissions
- **CI:** path-filter triggers must be rewritten for the new repository root;
  workflows only run from the default branch of *their* repository
- **Deployments:** Vercel projects, Docker registries, Supabase projects and
  their env wiring; recorded deploy state in `projects.json` (`deploys`,
  `pausedDeployment`) must be re-pointed
- **Registry:** `projects.json` entries and every test that validates them (§6)
- **E2E ownership:** visual baselines and Playwright webServer blocks (§3.1)

## 6. Registry impact — the prerequisite, now built

`projects.json` historically encoded `path` as a directory inside *this*
repository, and `src/registry.test.ts` fails on any registered path that is
missing (the guard designed in `docs/branch-splits.md`). An extraction
therefore could not land cleanly until the registry could describe an external
repository. **That capability now exists** (this document's companion change):

- `scripts/registry-schema.mjs` — one validator, three consumers
  (generator, test suite, synthetic failure-mode tests). Per-entry rules for
  four source states: `local` (default; requires an existing path, forbids a
  repository URL), `extracting` (path plus target `repository` +
  `defaultBranch`), `external` (no path; requires `repository` +
  `defaultBranch`; no `devPort`/`deploys`/`pausedDeployment`; `kind` limited
  to `project`/`product`), `archived` (no path; repository optional).
  Catalogue entries still require a local path — `build-catalogue.mjs` and the
  company-platform catalogue tests consume `.path`, so they cannot be handed a
  path-less entry.
- `scripts/build-registry.mjs` — emits `source` on every entry, merges
  path-less products from `DECLARED_PRODUCTS`, accepts extraction-state
  overrides in `REGISTRY_META`, and **refuses to write or `--check` a registry
  that fails validation**.
- `src/registry.test.ts` — runs the validator over the committed registry in
  CI (via `npm test`), keeps every cross-entry rule (uniqueness, blocks, tree
  agreement) applying to path-less entries too, and demonstrates each
  state-rule failure on synthetic data.

```jsonc
// What an extracted ContextVault will look like — no entry exists yet:
{
  "slug": "contextvault",
  "source": "external",
  "repository": "https://github.com/MwaJr3/contextvault",
  "defaultBranch": "main"
  // "path" omitted — external entries are first-class without one
}
```

Two CI gaps remain for the follow-up enforcement PR: no workflow runs
`build-registry.mjs --check` (staleness), and the `UX engine quality gate`
job currently stops at a **pre-existing** `npm run lint` failure — 12 errors in
five company frontends, reproducible at base commit `a9c01c7` with
`git stash` — so its `npm test` step (where the registry tests live) never
runs on a pull request until those errors are fixed.

## 7. Acceptance tests for every extraction

Applied exactly the way `docs/branch-splits.md` validated the branch splits —
as a stranger, from a fresh clone of the **new** repository:

1. Fresh clone → install → full test suite green (unit + integration + the
   project's own Playwright/Vitest).
2. Build and, where applicable, Docker Compose up → smoke the primary flow.
3. Confirm no file outside the moved set is referenced (grep for `../` escapes
   and repo-root markers — the scan method used in §2.2).
4. CI workflows run green on the new repository's default branch.
5. Registry in the central repo updated and green (`src/registry.test.ts` +
   `build-registry.mjs --check`).
6. **Originals stay in place until 1–5 pass.** Deletion is a separate,
   later change — never part of the extraction commit.

## 8. Recommended sequence

1. **This map + the registry schema PR** (no code movement) — built together;
   the schema is §6's prerequisite, CI enforcement of `--check` and the
   pre-existing lint repair follow immediately as the CI-enforcement PR.
2. **Pilot: ContextVault** (§4.1 #1) through §7 acceptance.
3. **Vocal Separator** (after e2e ownership decision) → **WorkNiche** →
   **Company Platform** (after claim-check decision).
4. **Company apps only when an independent release justifies it** — Tessera /
   TranscriptWise / ChessScope first among them; small CLI tools stay grouped.
5. **SynapseHub Connected last**, gated on the canonical-portfolio decision
   and root-SPA split (§4.4).
6. After each extraction: update `projects.json`, this map's verdict table,
   and record the new repository URL/CI/deployment evidence.

## 9. What this map does not claim

- It does not assert that any target repository exists — none were created.
- It does not measure CI runtime, deployment state, or secrets outside the
  repository; those are inventoried per-extraction at step time (§5).
- It does not decide the portfolio-canonical question or the fate of
  `challenges/`; both are inputs to §4.4, tracked separately.
- Scan coverage: import/relative-path greps over TypeScript/TSX/Python,
  package-boundary enumeration, workflow trigger inspection and workspace
  configuration. Generated files (`dist/`, lockfiles) and `node_modules`
  were excluded.
