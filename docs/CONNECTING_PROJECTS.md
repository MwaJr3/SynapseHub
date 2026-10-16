# Connecting a case study to its application and repository

The portfolio is built **catalogue-first**: all nine projects are documented before any of them has a public
deployment. This document is the procedure for connecting a project to the real thing once it exists — one edit,
and the links appear everywhere they belong.

---

## Where the links come from

```text
src/config/deployment.ts   ← you edit this
        │
        ▼
connectProjects()          ← src/data/projects/index.ts (validates and merges)
        │
        ▼
PortfolioProject.liveDemoUrl / .repositoryUrl
        │
        ├── ProjectCard (library + featured sections)
        ├── Case-study header actions
        ├── Deployment panel on the case-study page
        ├── Copy-link / share area
        └── Footer connection counters
```

Nothing else needs editing: cards, headers and panels render from the merged records, and any project that has no
entry simply shows _"Application and source not yet connected"_ instead of a dead button.

---

## Step 1 — Add the entry

```ts
// src/config/deployment.ts
export const deploymentRegistry: DeploymentRegistry = {
  learnbridge: {
    liveDemoUrl: 'https://learnbridge.your-domain.org',
    repositoryUrl: 'https://github.com/MwaJr3/learnbridge',
    demoNote: 'Seeded demo learner account; synthetic, resettable data only.',
    note: 'Connected 2026-11-02',
  },
};
```

| Field           | Rules                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `liveDemoUrl`   | `https://` (plain `http://` is accepted only for `localhost` / `127.0.0.1` during development). Must not point at a source-code host.                          |
| `repositoryUrl` | `https://` URL on a source host (`github.com`, `gitlab.com`, `codeberg.org`, `bitbucket.org`).                                                                 |
| `demoNote`      | Optional. Resettable, synthetic demo access instructions only — **never real credentials**. It replaces the "Running it yourself" line on the case-study page. |
| `note`          | Optional. Free-text status, e.g. "repository published, deployment pending".                                                                                   |

The `slug` key must match `PortfolioProject.slug`, which is also the case-study route: `/projects/<slug>`.

## Step 2 — Verify

```bash
npm run check      # type check → lint → tests → build
```

The data validation (`src/lib/validate.ts`) fails the suite if:

- the registry references a slug that is not a catalogue project;
- a URL is malformed or uses an unsafe scheme;
- a value looks like a placeholder (`example.com`, `TODO`, `TBD`, `#`) — placeholders are treated as errors, not
  as configuration;
- `liveDemoUrl` resolves to a source-code host (a strong signal that the two fields were swapped).

`repositoryUrl` and `liveDemoUrl` are never interchanged: a value configured for one field is only ever rendered
from that field.

## Step 3 — Confirm in the running site

```bash
npm run dev
```

Check, for the project you connected:

1. The card in `/projects` shows **Live demo** and/or **Source code**, opening in a new tab with
   `rel="noopener noreferrer"`.
2. The case-study header shows the same actions, next to the internal _All projects_ link and copy-link control.
3. The _Application and source_ panel reports **Connected** with a link rather than the "not yet connected" note.
4. The footer counters ("N of 9 connected") update.

---

## Step 4 — Replace illustrative previews with real screenshots

1. Capture the screen with synthetic, non-sensitive data. Hide learner records, credentials, personal details and
   private URLs.
2. Save it to `public/screenshots/<slug>/<name>.png` (or `.webp` / `.jpg`), keeping dimensions near 1280×800 so the
   declared `width`/`height` keep layout stable.
3. Update the preview in the project record:

```ts
{
  id: 'learnbridge-primary',
  view: 'primary',                       // ignored once screenshotSrc is set
  screenshotSrc: '/screenshots/learnbridge/catalogue.png',
  alt: 'LearnBridge course catalogue with an offline-ready lesson pack and a sync status strip.',
  caption: 'Course library with per-item offline availability, captured with seeded demo data.',
  isIllustrative: false,                 // a capture, not an illustration
}
```

The gallery renders the image instead of the composition, labels it _captured screenshot_, and validation fails if
an entry claims to be real without a `screenshotSrc`. Screenshots that show seeded data should say so in the caption.

---

## Adding a tenth project

1. Create `src/data/projects/<slug>.ts` with a full `PortfolioProject` record (copy the shape from an existing
   file; the type is in `src/types/index.ts`).
2. Add the slug to the `ProjectSlug` union in `src/types/index.ts`.
3. Register the record in `src/data/projects/index.ts`.
4. Add a visual case in `src/components/visuals/ProjectVisual.tsx` plus a composition file — the `switch` is
   exhaustive, so a missing visual is a type error.
5. Expected count is asserted in `src/lib/validate.ts` (`EXPECTED_PROJECT_COUNT`); update it, then run
   `npm run check` and fix anything it reports.
6. Add the slug to `projectSlugs` in `scripts/generate-sitemap.mjs` so the case study appears in the sitemap.

---

## Checklist before a project is considered "connected"

- [ ] Real application URL verified in a browser, not just typed into the registry
- [ ] Repository is public (or the field is left empty and the case study says the repository is not public)
- [ ] Demo data is synthetic and resettable; no real credentials in `demoNote`
- [ ] Screenshots (if published) show only synthetic or consented data
- [ ] `npm run check` passes
- [ ] Case-study limitations still describe the deployed build accurately (they are not marketing copy)
