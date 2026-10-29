# The two splits

Two collections were asked to live on their own branches:

| Collection | Where it is now | Why it is being split |
| --- | --- | --- |
| **CBU assignments** | `coursework/cbu-assignments/` | Four separate coursework projects with their own tests, build files and CI workflow. Nothing else in the repository imports them. |
| **Challenge prototypes** | `challenges/` | Sixty prototypes today, expected to pass sixty and gain real backends. A collection that grows that way should not live inside a website's source tree. |

## Status: cut and published (2026-10-28)

| Branch | Head | Contents | Standalone test |
| --- | --- | --- | --- |
| `split/challenges` | `ee0b7a1` | 19 files — `src/`, `package.json`, `vitest.config.ts`, README | 3 files / 9 tests pass |
| `split/cbu-assignments` | `7d82153` | 208 files — the four coursework projects, tests, workflow | 13 tests pass |

Both were cut with `scripts/split-branches.sh` from `main` after PR #43 merged, and
both were checked the way a stranger would: cloned from GitHub on their own branch,
dependencies installed, suite run. Nothing was taken on trust from the working copy.

```sh
git clone --branch split/challenges --single-branch https://github.com/MwaJr3/SynapseHub.git
cd SynapseHub && npm install react@19 react-dom@19 && npm test   # 3 files, 9 tests

git clone --branch split/cbu-assignments --single-branch https://github.com/MwaJr3/SynapseHub.git
cd SynapseHub && pytest tests                                     # 13 passed
```

The branches are snapshots, not forks: they hold the history that touched their
directory — two commits for the collection, seven for CBU — because everything
before the extraction lived at other paths. The full history stays on `main`.

**`main` still contains both collections.** Cutting the branch is not the same as
moving the code out: the site imports `challenges/` through `@challenges`, so
deleting it breaks the portfolio. That removal is a separate decision, listed below.
Until it happens, both branches exist alongside the copy on `main`.

### What the branch cut left behind, on purpose

`main` still claims this code lives here, in `company-platform/src/content/evidence.ts`
(`inRepoPath: 'challenges'`) and in `projects.json`. Two tests are written to fail at
the moment a collection leaves the repository without those claims being rewritten:
`company-platform/tests/evidence-paths.test.ts` and the registry path check. They do
not fire today, because nothing has been removed from `main`.

## What "self-contained" was verified to mean

**Challenges (`challenges/`).** The collection was rewritten so that, apart from
React, it imports only its own files:

- `challengeManifest.ts`, `appRegistry.ts`, `gameLogic.ts` and the ten mode
  components moved out of `src/` into `challenges/src/`.
- Every import inside the collection became relative (`../manifest`,
  `../apps/appRegistry`). No `@/` path remains.
- The site reaches it through one alias, `@challenges`, declared in exactly two
  places: `vite.config.ts` and `tsconfig.json`. Removing the collection means
  deleting that alias and the pages that route to it.
- **Proof:** the directory was copied to a temporary folder outside the repository,
  given a bare `package.json` and a six-line Vitest config, and its suite ran
  unchanged — 3 files, 9 tests, passing. It does not need this repository to build.

**CBU (`coursework/cbu-assignments/`).** Already self-contained: nothing outside the
folder imports it. Two things were wrong and are fixed:

- `bank_system/__init__.py` and `library_management/__init__.py` imported their Tk
  GUIs eagerly, so *any* import of the package needed `tkinter` — a system package
  absent from headless machines. The service layer could not be tested anywhere
  without it. Both now resolve the GUI lazily.
- **Proof:** the suite went from 17 collection errors to **13 passing tests**,
  executed here.

## The consequence a split creates, and where it is enforced

Splitting a collection removes code from `main`. Two places assert that code is
here, and both would otherwise go stale silently:

| Claim | Guard |
| --- | --- |
| `company-platform/src/content/evidence.ts` names where each piece of work lives | `company-platform/tests/evidence-paths.test.ts` — fails when an `inRepoPath` does not exist |
| `projects.json` records every project with its path | `src/registry.test.ts` — fails on a registered path that is missing |

Both were already wrong once: the evidence module still pointed at `src/apps`
after the challenges moved, and had a path that was a comma-separated list of two
directories. Both are fixed, and the new test would have caught either.

**So a split is not finished when the branch is cut.** It is finished when those
two claims have been rewritten to say where the code went.

## The commands

This is what was run, and what to run if either branch is ever re-cut:

```bash
# 1. Work from a clean main.
git switch main && git pull

# 2. Cut each collection, with its history, into its own branch.
./scripts/split-branches.sh --push
```

The script refuses a dirty tree and an existing branch, prints the commit count and
size of each split, and does not push without `--push`.

It uses `git subtree split` when that is installed and falls back to replaying each
commit's subtree through `git commit-tree` when it is not — `git subtree` and
`git filter-branch` are both absent from the image this was prepared in, and the
fallback was proved against a throwaway clone before it was used here.

### Afterwards

1. Remove the collection from `main` (`git rm -r challenges` or
   `git rm -r coursework/cbu-assignments`) in a separate commit.
2. Rewrite the two claims above to point at the new repository.
3. Delete the `@challenges` alias and the pages that route to it, or repoint them
   at a published package.
4. Regenerate the registry: `npm run registry`.

Doing 1 without 2–4 leaves `main` with claims it can no longer support, and two
failing tests saying so.

## Why the challenges could not simply be deleted from the site

The 60 records are not a self-contained app sitting in a corner — the portfolio
site reads them on its home page, project pages, skills page, sitemap and footer.
Moving the *runtime* out was safe and is done; deleting the *content* from the site
would gut it, and that is a product decision rather than a refactor. The site still
shows the collection; it just no longer owns the code.
