# UX engine repository audit

Generated 2026-10-27 by `npx vite-node scripts/ux-scan.ts` from the Advanced UX/UI engine's static detectors.

Scope: **21 frontends**, **409 source files**, **75 findings**.

## Method and limitations

- Static, deterministic analysis of TS/TSX/CSS source — the same rule IDs and pattern traceability as the interactive audit at `/ux-engine`. Detectors cover focus removal, 44px touch targets, form labels and accessible names, image alt text, autoFocus, z-index escalation, spacing tokens, motion vocabulary, reduced-motion fallbacks, WCAG contrast pairs and hover-only handlers.
- Runtime accessibility is enforced separately by axe-core (`src/test/axe-a11y.test.tsx`) against the rendered DOM; this static scan cannot execute the interfaces.
- Findings carry confidence levels: **high** for mechanical facts (outline removal, missing labels, z-index, contrast math), **medium/low** for structural heuristics that still need a human or runtime check.
- This scan does not execute the interfaces: runtime keyboard navigation, screen-reader output, rendered hit-box geometry and visual contrast over images remain manual verification steps.
- Python backends, CLI tools and data notebooks are out of scope because they ship no UI.

## Summary

| Frontend | Files | Critical | Major | Minor | Nice | High conf. | Medium | Low |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Portfolio website | 100 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Company platform (Next.js) | 76 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| WorkNiche (Next.js) | 78 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Vocal separator web app | 10 | 0 | 0 | 75 | 0 | 0 | 75 | 0 |
| apps/campusflow | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/chessscope | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/circuitlab-calc | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/classconnect | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/dependsecure | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/eduaccess | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/fileguard | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/frontpage | 33 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/learnbridge | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/learnpulse | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/openlearn-commons | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/pathwise | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/reachlearn | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/sentinelcore | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/sentinellog | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/teachcraft | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/tutorspring | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Portfolio website

Root: `src` — 0 findings.

No findings — every static detector passed.

## Company platform (Next.js)

Root: `company-platform/src` — 0 findings.

No findings — every static detector passed.

## WorkNiche (Next.js)

Root: `workniche/src` — 0 findings.

No findings — every static detector passed.

## Vocal separator web app

Root: `vocal-separator/web/src` — 75 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:86` | Rule ".header-inner" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 2 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:96` | Rule ".brand-block" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 3 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:135` | Rule ".header-actions" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 4 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:143` | Rule ".availability-chip" uses literal spacing 7, 6, 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 5 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:188` | Rule ".page" uses literal spacing 30, 56px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 6 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:202` | Rule ".panel-heading" uses literal spacing 18, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 7 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:253` | Rule ".button" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 8 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:309` | Rule ".button.large" uses literal spacing 13, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 9 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:329` | Rule ".alert" uses literal spacing 18, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 10 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:350` | Rule ".alert.inline" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 11 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:369` | Rule ".auth-layout" uses literal spacing 26px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 12 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:404` | Rule ".capability-grid" uses literal spacing 30px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 13 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:411` | Rule ".capability-grid article" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 14 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:426` | Rule ".capability-grid h2" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 15 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:443` | Rule ".honesty-panel h2" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 16 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:449` | Rule ".honesty-list" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 17 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:471` | Rule ".segmented-control" uses literal spacing 6, 22, 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 18 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:520` | Rule ".inline-form select" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 19 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:536` | Rule ".compact-field select" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 20 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:559` | Rule ".auth-health" uses literal spacing 26, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 21 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:565` | Rule ".auth-health h3" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 22 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:575` | Rule ".system-list > div" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 23 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:604` | Rule ".compact-system" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 24 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:615` | Rule ".content-column" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 25 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:627` | Rule ".stem-list" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 26 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:635` | Rule ".project-list" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 27 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:668` | Rule ".project-card" uses literal spacing 5, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 28 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:715` | Rule ".selected-job-chip" uses literal spacing 13, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 29 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:735` | Rule ".file-row" uses literal spacing 18, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 30 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:763` | Rule ".dropzone" uses literal spacing 18, 28px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 31 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:825` | Rule ".selected-file" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 32 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:849` | Rule ".options-grid" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 33 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:871` | Rule ".radio-card" uses literal spacing 13, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 34 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:894` | Rule ".radio-card span" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 35 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:909` | Rule ".check-field" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 36 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:940` | Rule ".large-check" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 37 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:947` | Rule ".practice-banner" uses literal spacing 13, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 38 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:958` | Rule ".job-row" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 39 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1010` | Rule ".section-actions" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 40 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1039` | Rule ".stages-list" uses literal spacing 9, 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 41 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1047` | Rule ".stage-row" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 42 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1098` | Rule ".warning-list" uses literal spacing 18, 14, 34px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 43 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1108` | Rule ".warning-list.compact" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 44 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1115` | Rule ".summary-grid" uses literal spacing 14, 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 45 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1122` | Rule ".summary-card" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 46 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1150` | Rule ".export-bar" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 47 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1175` | Rule ".transport" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 48 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1207` | Rule ".transport-grid .check-field" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 49 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1229` | Rule ".download-link" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 50 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1263` | Rule ".pitch-section" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 51 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1281` | Rule ".subsection-heading p" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 52 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1305` | Rule ".pitch-legend" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 53 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1314` | Rule ".pitch-legend span" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 54 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1331` | Rule ".stem-row" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 55 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1347` | Rule ".stem-identity" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 56 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1354` | Rule ".stem-title-row" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 57 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1383` | Rule ".stem-wave" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 58 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1400` | Rule ".stem-controls" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 59 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1420` | Rule ".stem-details" uses literal spacing 15, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 60 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1433` | Rule ".metric-grid > div" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 61 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1441` | Rule ".inline-form" uses literal spacing 10, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 62 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1453` | Rule ".download-row" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 63 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1498` | Rule ".model-card" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 64 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1521` | Rule ".model-heading p" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 65 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1556` | Rule ".voice-metrics" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 66 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1560` | Rule ".prediction-list" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 67 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1567` | Rule ".prediction-list span" uses literal spacing 6, 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 68 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1577` | Rule ".withheld-box" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 69 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1582` | Rule ".voice-actions" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 70 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1600` | Rule ".raw-json" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 71 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1607` | Rule ".raw-json summary" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 72 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1638` | Rule ".empty-state" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 73 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1648` | Rule ".admin-summary" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 74 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1699` | Rule ".page" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 75 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1721` | Rule ".panel" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |

## apps/campusflow

Root: `apps/campusflow/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/chessscope

Root: `apps/chessscope/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/circuitlab-calc

Root: `apps/circuitlab-calc/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/classconnect

Root: `apps/classconnect/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/dependsecure

Root: `apps/dependsecure/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/eduaccess

Root: `apps/eduaccess/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/fileguard

Root: `apps/fileguard/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/frontpage

Root: `apps/frontpage/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/learnbridge

Root: `apps/learnbridge/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/learnpulse

Root: `apps/learnpulse/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/openlearn-commons

Root: `apps/openlearn-commons/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/pathwise

Root: `apps/pathwise/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/reachlearn

Root: `apps/reachlearn/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/sentinelcore

Root: `apps/sentinelcore/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/sentinellog

Root: `apps/sentinellog/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/teachcraft

Root: `apps/teachcraft/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/tutorspring

Root: `apps/tutorspring/frontend/src` — 0 findings.

No findings — every static detector passed.

## Triage decisions and deferred findings

- **Fixed in this pass (all critical and major defects):** removed focus outlines without replacement, sub-44px touch targets, unlabelled controls, z-index escalation past the named layers, off-vocabulary motion durations, and missing reduced-motion fallbacks. Every fix is re-verified by this scan and by the regression gate in `src/features/ux-engine/scanner/repoScan.test.ts`.
- **Deferred (minor token hygiene only):** the remaining findings are `TOKEN-SPACING-01` on literal spacing inside hand-tuned, non-minified custom stylesheets. They are convention deviations rather than user-facing defects. Normalising them means choosing between the two nearest scale tokens at each site, which changes rendered geometry; without a visual-regression harness for those standalone apps the change needs a design review instead of a blind mechanical edit. Each row below already carries the rule remediation (nearest 4px-scale token) and the exact location.

| Frontend | Location | Off-scale values |
| --- | --- | --- |
| Vocal separator web app | `vocal-separator/web/src/styles.css:86` | 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:96` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:135` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:143` | 7, 6, 11px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:188` | 30, 56px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:202` | 18, 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:253` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:309` | 13, 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:329` | 18, 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:350` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:369` | 26px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:404` | 30px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:411` | 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:426` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:443` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:449` | 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:471` | 6, 22, 5px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:520` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:536` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:559` | 26, 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:565` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:575` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:604` | 9px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:615` | 22px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:627` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:635` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:668` | 5, 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:715` | 13, 15px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:735` | 18, 15px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:763` | 18, 28px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:825` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:849` | 22px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:871` | 13, 15px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:894` | 5px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:909` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:940` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:947` | 13, 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:958` | 15px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1010` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1039` | 9, 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1047` | 11px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1098` | 18, 14, 34px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1108` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1115` | 14, 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1122` | 17px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1150` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1175` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1207` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1229` | 7px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1263` | 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1281` | 5px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1305` | 11px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1314` | 7px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1331` | 17px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1347` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1354` | 9px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1383` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1400` | 15px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1420` | 15, 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1433` | 11px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1441` | 10, 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1453` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1498` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1521` | 5px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1556` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1560` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1567` | 6, 9px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1577` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1582` | 9px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1600` | 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1607` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1638` | 22px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1648` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1699` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1721` | 18px |

## Remediation contract

Every finding resolves through the engine rule catalog: the rule statement, impacted users, remediation steps and verification procedure are available from `/ux-engine` and `src/features/ux-engine/rules.ts`. Re-run this scan after fixes to confirm the finding disappears.
