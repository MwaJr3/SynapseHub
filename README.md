# The challenge collection

Sixty interactive prototypes — polls, trackers, games, editors, landing pages —
built from a shared set of interface **modes**. This directory is a unit, not a
folder of the site: apart from React and its own files it imports nothing.

```
challenges/
├── package.json          the boundary (private, no build step of its own)
├── src/
│   ├── index.ts          the only entry point the site uses
│   ├── manifest.ts       the 60 records: slug, title, difficulty, categories
│   ├── apps/
│   │   ├── appRegistry.ts    slug → mode, and the copy each mode shows
│   │   ├── gameLogic.ts      tic-tac-toe and Connect Four rules, tested
│   │   └── *.test.ts
│   └── components/       one component per mode (collection, game, kanban, …)
└── README.md
```

## Why it is shaped like this

The owner's plan is for this to grow past sixty and to gain real backends. A
collection that grows that way should not be spread through a website's source
tree, so it was given one entry point (`src/index.ts`), one alias (`@challenges`),
and no imports from the application. The site consumes it; it does not own it.

The split into its own repository is prepared and documented in
[`docs/branch-splits.md`](../docs/branch-splits.md). It has **not** been performed:
a branch cannot be created from the session that wrote this.

## Using it

```ts
import { challengeManifest, getAppDefinition } from '@challenges';
```

Components are reached by path, because the site routes to a mode component
rather than through the registry:

```ts
import { GameApp } from '@challenges/components/GameApp';
```

## Tests

```bash
npx vitest run challenges/src        # 3 files, 9 tests
```

The suite was also run **outside this repository** — the directory copied to a
temporary folder with a bare `package.json` and a one-line Vitest config — to
prove the boundary is real and not just tidy. It passed there unchanged.

## What is not here

Nothing here is deployed, and there is no live demo. The prototypes are local-first:
state lives in the browser, nothing is sent anywhere, and where a public API is
used (dictionary, recipes, exchange rates) the copy says so and does not claim the
data is ours.
