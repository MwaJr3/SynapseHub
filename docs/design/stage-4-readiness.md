# Stage-4 readiness gate (for the cross-product 3D pass)

**Status: 0 of 6 conditions fully met — 3 partially.** The 3D integration stays
deferred. An isolated prototype exists (`prototypes/tessera-3d/`) so the design
question can be answered without touching unstable screens.

This is an assessment with evidence, not a claim that stage 4 is finished. Each row
names what would move it to *met*, and the command that would show it.

| # | Condition | Status | Evidence | What would make it met |
| --- | --- | --- | --- | --- |
| 1 | Core screens and navigation flows are approved | **Not met** | No approval record exists. Tessera's navigation is a flat list of ten sections (`companies/tamuzi/tessera/frontend/src/App.tsx`, `NAV`); the planner is one route plus an optional Tessera panel. Both are *implemented*, neither has been reviewed and signed off. | A written approval naming the screens in scope (Today, Profile, Library, Review, Competency, Knowledge, Map, Chess, Tutor, Sources; Study planning), with the navigation grouping decided. |
| 2 | Shared component interfaces and design tokens are defined | **Partial** | Tessera: 8 primitives in `frontend/src/ui.tsx` (Card, SectionTitle, Badge, MasteryBar, Loading, ErrorNote, EmptyState, ReasonList) and a documented radius scale plus colour tokens in `styles.css`. Portfolio: tokens in `src/styles/index.css`, one 5-step radius scale site-wide. **But there is no shared kit *between* Tessera and the planner** — they are separate products with separate components, which is the decision the 3D pass would have to reconcile. | Either a cross-product token contract (one file both consume) or an explicit decision that the two keep separate kits and only share the 3 bands of colour. |
| 3 | Loading, empty, error and success states are designed | **Partial** | Loading / empty / error exist as components and are used; the UX engine reports 0 `bare-loading`, 0 `swallowed-error`, 0 `disabled-without-reason` across this repository (`docs/ux/audit-repository.md`). Success feedback is *ad hoc* (status lines inside pages) and not systematic. | A state matrix per screen: idle → loading → empty → error → success, with the component used for each. |
| 4 | Responsive layouts and accessibility requirements are covered | **Partial** | 3 media queries and `prefers-reduced-motion` in Tessera's stylesheet; Tailwind breakpoints in both products; the source-level audit is clean (0 defects across 37 projects), including contrast measured from the palette. **No browser or assistive-technology testing has been done here** — this environment has no browser, and the audit says so in every report. | A measured pass at 320 / 768 / 1440 px in a browser, keyboard-only walkthroughs, and one screen-reader pass. Those cannot be claimed from source. |
| 5 | Critical user journeys pass functional testing | **Partial** | 329 backend tests, 85 Tessera UI tests, 138 planner tests, all green. The journeys are covered at the API and component level. **Not covered:** a real browser walk (sign-in → review → competency), and the planner's chat, which needs a configured model provider (unconfigured by default, and honestly labelled as such). | An end-to-end run of the three journeys in a browser against a seeded deployment, with the provider configured. |
| 6 | No unresolved structural UI decisions would invalidate the 3D work | **Not met** | Three are open: where the Tessera summary panel belongs on the planner page; whether Tessera's ten nav items stay flat; and **which surface the 3D graph would live on** (Today, Map, or a new one). Any of those changes the scene's composition and camera. | Decisions recorded for all three, after conditions 1–5. |

## The gate, stated as a rule

> The cross-product 3D pass starts when all six rows read *met* and the decisions in
> rows 1, 2 and 6 are written down. Until then, work on this direction happens only
> inside `prototypes/tessera-3d/`, which imports nothing from the products.

## What can be done while the gate is closed

1. **Direction** — the prototype's palette is the Tessera dark token set on purpose;
   that is the cheapest way to find out whether the two products can share a visual
   language without sharing components.
2. **Isolation** — the prototype is one HTML file with no build and no imports. A
   change to any stage-4 screen cannot break it, and nothing it learns has to be
   unpicked from a production route.
3. **Performance budgets** — stated in `prototypes/tessera-3d/README.md` (≤ 4 ms
   average frame, ≤ 20 KB JS, no requests after load, DPR ≤ 2, zero rAF when hidden).
   They are budgets, not measurements on your hardware: the prototype exposes a live
   frame readout so the numbers can be taken where it would actually run.
4. **Reduced motion and the non-3D fallback** — built now, not bolted on: the scene
   opens paused when the OS asks for reduced motion, watches the setting, and is
   replaced by a static, readable list when canvas is unavailable.

## Why not start the integration anyway

Because the cost of a wrong 3D surface is paid twice: once in the scene (camera,
composition and label density all depend on where it sits) and once in the screens it
was built against when they change. The prototype is the cheap way to find out what
depth is *for*; the integration is the expensive way to find out it was for the wrong
place.
