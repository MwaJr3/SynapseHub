# UX engine repository audit

Generated 2026-10-28 by `northstar scan` (`npm run ux:scan`) from Northstar's static detectors.

Scope: **23 frontends**, **463 source files**, **84 findings**.

## Method and limitations

- Static, deterministic analysis of TS/TSX/CSS/HTML source — the same rule IDs and pattern traceability as the interactive audit at `/ux-engine`. Detectors cover focus removal, 44px touch targets, form labels and accessible names, image alt text, autoFocus, heading order, document language, key handlers on non-interactive elements, keyboard-reachable scroll regions, z-index escalation, spacing tokens, motion vocabulary, reduced-motion fallbacks, WCAG contrast pairs (including `var(--token)` colour resolution) and hover-only handlers.
- Low-confidence scroll-region cues and medium-confidence structural heuristics need a human or runtime check; the Playwright browser suite (`e2e/`) confirms them against the rendered DOM.
- Runtime accessibility is enforced separately by axe-core (`src/test/axe-a11y.test.tsx`) against the rendered DOM; this static scan cannot execute the interfaces.
- Findings carry confidence levels: **high** for mechanical facts (outline removal, missing labels, z-index, contrast math), **medium/low** for structural heuristics that still need a human or runtime check.
- This scan does not execute the interfaces: runtime keyboard navigation, screen-reader output, rendered hit-box geometry and visual contrast over images remain manual verification steps.
- Python backends, CLI tools and data notebooks are out of scope because they ship no UI.

## Summary

| Frontend | Files | Critical | Major | Minor | Nice | High conf. | Medium | Low |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Portfolio website | 71 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Challenge collection | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Company platform (Next.js) | 106 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| WorkNiche (Next.js) | 78 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Vocal separator web app | 11 | 0 | 0 | 76 | 0 | 0 | 75 | 1 |
| apps/campusflow | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/chessscope | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/circuitlab-calc | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/classconnect | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/dependsecure | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/eduaccess | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/fileguard | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/frontpage | 34 | 0 | 0 | 8 | 0 | 0 | 0 | 8 |
| apps/learnbridge | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/learnpulse | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/openlearn-commons | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/pathwise | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/reachlearn | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/sentinelcore | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/sentinellog | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/teachcraft | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/tessera | 22 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apps/tutorspring | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Portfolio website

Root: `src` — 0 findings.

No findings — every static detector passed.

## Challenge collection

Root: `challenges/src` — 0 findings.

No findings — every static detector passed.

## Company platform (Next.js)

Root: `company-platform/src` — 0 findings.

No findings — every static detector passed.

## WorkNiche (Next.js)

Root: `workniche/src` — 0 findings.

No findings — every static detector passed.

## Vocal separator web app

Root: `vocal-separator/web/src` — 76 findings.

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
| 9 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:333` | Rule ".alert" uses literal spacing 18, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 10 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:354` | Rule ".alert.inline" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 11 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:373` | Rule ".auth-layout" uses literal spacing 26px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 12 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:408` | Rule ".capability-grid" uses literal spacing 30px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 13 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:415` | Rule ".capability-grid article" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 14 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:430` | Rule ".capability-grid h2" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 15 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:447` | Rule ".honesty-panel h2" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 16 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:453` | Rule ".honesty-list" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 17 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:475` | Rule ".segmented-control" uses literal spacing 6, 22, 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 18 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:524` | Rule ".inline-form select" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 19 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:540` | Rule ".compact-field select" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 20 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:563` | Rule ".auth-health" uses literal spacing 26, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 21 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:569` | Rule ".auth-health h3" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 22 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:579` | Rule ".system-list > div" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 23 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:608` | Rule ".compact-system" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 24 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:619` | Rule ".content-column" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 25 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:631` | Rule ".stem-list" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 26 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:639` | Rule ".project-list" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 27 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:672` | Rule ".project-card" uses literal spacing 5, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 28 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:719` | Rule ".selected-job-chip" uses literal spacing 13, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 29 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:739` | Rule ".file-row" uses literal spacing 18, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 30 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:767` | Rule ".dropzone" uses literal spacing 18, 28px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 31 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:829` | Rule ".selected-file" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 32 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:853` | Rule ".options-grid" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 33 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:875` | Rule ".radio-card" uses literal spacing 13, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 34 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:898` | Rule ".radio-card span" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 35 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:913` | Rule ".check-field" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 36 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:944` | Rule ".large-check" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 37 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:951` | Rule ".practice-banner" uses literal spacing 13, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 38 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:962` | Rule ".job-row" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 39 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1014` | Rule ".section-actions" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 40 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1043` | Rule ".stages-list" uses literal spacing 9, 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 41 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1051` | Rule ".stage-row" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 42 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1102` | Rule ".warning-list" uses literal spacing 18, 14, 34px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 43 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1112` | Rule ".warning-list.compact" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 44 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1119` | Rule ".summary-grid" uses literal spacing 14, 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 45 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1126` | Rule ".summary-card" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 46 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1154` | Rule ".export-bar" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 47 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1179` | Rule ".transport" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 48 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1211` | Rule ".transport-grid .check-field" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 49 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1233` | Rule ".download-link" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 50 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1267` | Rule ".pitch-section" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 51 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1285` | Rule ".subsection-heading p" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 52 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1309` | Rule ".pitch-legend" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 53 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1318` | Rule ".pitch-legend span" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 54 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1335` | Rule ".stem-row" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 55 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1351` | Rule ".stem-identity" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 56 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1358` | Rule ".stem-title-row" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 57 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1387` | Rule ".stem-wave" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 58 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1404` | Rule ".stem-controls" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 59 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1424` | Rule ".stem-details" uses literal spacing 15, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 60 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1437` | Rule ".metric-grid > div" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 61 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1445` | Rule ".inline-form" uses literal spacing 10, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 62 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1457` | Rule ".download-row" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 63 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1502` | Rule ".model-card" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 64 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1525` | Rule ".model-heading p" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 65 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1560` | Rule ".voice-metrics" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 66 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1564` | Rule ".prediction-list" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 67 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1571` | Rule ".prediction-list span" uses literal spacing 6, 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 68 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1581` | Rule ".withheld-box" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 69 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1586` | Rule ".voice-actions" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 70 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1604` | Rule ".raw-json" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 71 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1611` | Rule ".raw-json summary" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 72 | minor | low | A11Y-SCROLL-01 (P46/P10) | `vocal-separator/web/src/styles.css:1618` | Rule ".raw-json pre" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 73 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1642` | Rule ".empty-state" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 74 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1652` | Rule ".admin-summary" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 75 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1703` | Rule ".page" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 76 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `vocal-separator/web/src/styles.css:1725` | Rule ".panel" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |

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

Root: `apps/frontpage/frontend/src` — 8 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | minor | low | A11Y-SCROLL-01 (P46/P10) | `apps/frontpage/frontend/src/styles/app.css:65` | Rule ".segmented" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 2 | minor | low | A11Y-SCROLL-01 (P46/P10) | `apps/frontpage/frontend/src/styles/app.css:104` | Rule ".dialog" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 3 | minor | low | A11Y-SCROLL-01 (P46/P10) | `apps/frontpage/frontend/src/styles/app.css:114` | Rule ".palette-list" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 4 | minor | low | A11Y-SCROLL-01 (P46/P10) | `apps/frontpage/frontend/src/styles/app.css:132` | Rule ".sidebar-scroll" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 5 | minor | low | A11Y-SCROLL-01 (P46/P10) | `apps/frontpage/frontend/src/styles/app.css:236` | Rule ".reader-scroll" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 6 | minor | low | A11Y-SCROLL-01 (P46/P10) | `apps/frontpage/frontend/src/styles/app.css:252` | Rule ".prose pre" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 7 | minor | low | A11Y-SCROLL-01 (P46/P10) | `apps/frontpage/frontend/src/styles/app.css:255` | Rule ".prose table" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 8 | minor | low | A11Y-SCROLL-01 (P46/P10) | `apps/frontpage/frontend/src/styles/app.css:331` | Rule ".table-wrap" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |

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

## apps/tessera

Root: `apps/tessera/frontend/src` — 0 findings.

No findings — every static detector passed.

## apps/tutorspring

Root: `apps/tutorspring/frontend/src` — 0 findings.

No findings — every static detector passed.

## Triage decisions and deferred findings

- **Fixed in this pass (all critical and major defects):** removed focus outlines without replacement, sub-44px touch targets, unlabelled controls, z-index escalation past the named layers, off-vocabulary motion durations, missing reduced-motion fallbacks, skipped heading levels, key handlers on non-interactive containers and a theme-aware contrast failure in the company platform (white text on light accent fills; replaced with a per-theme `--accent-contrast` foreground token). Every fix is re-verified by this scan and by the regression gate in `src/features/ux-engine/scanner/repoScan.test.ts`.
- **Deferred `TOKEN-SPACING-01` (minor token hygiene):** 75 findings on literal spacing inside the hand-tuned vocal-separator stylesheet. They are convention deviations rather than user-facing defects. Normalising them means choosing between the two nearest scale tokens at each site, which changes rendered geometry; the Playwright visual-regression suite (`e2e/`) now gates that change with committed screenshot baselines, so the cleanup is tracked separately rather than applied blind.
- **Review cues `A11Y-SCROLL-01` (low confidence):** 9 CSS rules create `overflow: auto/scroll` regions. CSS cannot see rendered overflow or tab order, so each is a review cue rather than a defect claim; the Playwright axe run (`e2e/`) executes `scrollable-region-focusable` against the rendered DOM to confirm or clear every cue, and the pinned location inventory in `repoScan.test.ts` fails the gate on any new cue.

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
| Vocal separator web app | `vocal-separator/web/src/styles.css:333` | 18, 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:354` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:373` | 26px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:408` | 30px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:415` | 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:430` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:447` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:453` | 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:475` | 6, 22, 5px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:524` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:540` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:563` | 26, 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:569` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:579` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:608` | 9px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:619` | 22px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:631` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:639` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:672` | 5, 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:719` | 13, 15px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:739` | 18, 15px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:767` | 18, 28px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:829` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:853` | 22px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:875` | 13, 15px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:898` | 5px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:913` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:944` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:951` | 13, 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:962` | 15px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1014` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1043` | 9, 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1051` | 11px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1102` | 18, 14, 34px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1112` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1119` | 14, 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1126` | 17px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1154` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1179` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1211` | 10px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1233` | 7px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1267` | 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1285` | 5px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1309` | 11px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1318` | 7px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1335` | 17px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1351` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1358` | 9px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1387` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1404` | 15px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1424` | 15, 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1437` | 11px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1445` | 10, 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1457` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1502` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1525` | 5px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1560` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1564` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1571` | 6, 9px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1581` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1586` | 9px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1604` | 20px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1611` | 14px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1618` | px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1642` | 22px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1652` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1703` | 18px |
| Vocal separator web app | `vocal-separator/web/src/styles.css:1725` | 18px |
| apps/frontpage | `apps/frontpage/frontend/src/styles/app.css:65` | px |
| apps/frontpage | `apps/frontpage/frontend/src/styles/app.css:104` | px |
| apps/frontpage | `apps/frontpage/frontend/src/styles/app.css:114` | px |
| apps/frontpage | `apps/frontpage/frontend/src/styles/app.css:132` | px |
| apps/frontpage | `apps/frontpage/frontend/src/styles/app.css:236` | px |
| apps/frontpage | `apps/frontpage/frontend/src/styles/app.css:252` | px |
| apps/frontpage | `apps/frontpage/frontend/src/styles/app.css:255` | px |
| apps/frontpage | `apps/frontpage/frontend/src/styles/app.css:331` | px |

## Remediation contract

Every finding resolves through the engine rule catalog: the rule statement, impacted users, remediation steps and verification procedure are available from `/ux-engine` and `src/features/ux-engine/rules.ts`. Re-run this scan after fixes to confirm the finding disappears.
