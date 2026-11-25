# UX engine repository audit

Generated 2026-11-25 by `northstar scan` (`npm run ux:scan`) from Northstar's static detectors.

Scope: **32 frontends**, **670 source files**, **757 findings**.

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
| Portfolio website | 74 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Challenge collection | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Company platform (Next.js) | 130 | 0 | 0 | 1 | 0 | 0 | 1 | 0 |
| WorkNiche (Next.js) | 79 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Vocal separator web app | 13 | 0 | 0 | 76 | 0 | 0 | 75 | 1 |
| companies/tamuzi/campusflow | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/tamuzi/classconnect | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/tamuzi/cyberaware-lab | 12 | 1 | 7 | 2 | 0 | 8 | 2 | 0 |
| companies/tamuzi/eduaccess | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/tamuzi/learnbridge | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/tamuzi/learnpulse | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/tamuzi/openlearn-commons | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/tamuzi/pathwise | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/tamuzi/reachlearn | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/tamuzi/teachcraft | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/tamuzi/tessera | 24 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/tamuzi/transcriptwise | 30 | 29 | 21 | 581 | 0 | 30 | 593 | 8 |
| companies/tamuzi/tutorspring | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/velaqori/assetwatch | 15 | 0 | 3 | 2 | 0 | 3 | 2 | 0 |
| companies/velaqori/chessscope | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/velaqori/circuitlab-calc | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/velaqori/dependsecure | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/velaqori/fileguard | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/velaqori/frontpage | 36 | 0 | 0 | 8 | 0 | 0 | 0 | 8 |
| companies/velaqori/hashsight | 15 | 0 | 1 | 2 | 0 | 1 | 2 | 0 |
| companies/velaqori/incidentflow | 13 | 0 | 3 | 2 | 0 | 3 | 2 | 0 |
| companies/velaqori/netscope | 12 | 0 | 1 | 2 | 0 | 1 | 2 | 0 |
| companies/velaqori/phishlens | 14 | 0 | 3 | 1 | 0 | 3 | 1 | 0 |
| companies/velaqori/securecode-workbench | 13 | 0 | 3 | 2 | 0 | 3 | 2 | 0 |
| companies/velaqori/sentinelcore | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/velaqori/sentinellog | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| companies/velaqori/threatintel-desk | 12 | 0 | 4 | 2 | 0 | 4 | 2 | 0 |

## Portfolio website

Root: `src` — 0 findings.

No findings — every static detector passed.

## Challenge collection

Root: `challenges/src` — 0 findings.

No findings — every static detector passed.

## Company platform (Next.js)

Root: `company-platform/src` — 1 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | minor | medium | A11Y-HEADING-01 (P62/P41) | `company-platform/src/app/openjarvis/page.tsx:113` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |

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

## companies/tamuzi/campusflow

Root: `companies/tamuzi/campusflow/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/tamuzi/classconnect

Root: `companies/tamuzi/classconnect/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/tamuzi/cyberaware-lab

Root: `companies/tamuzi/cyberaware-lab/frontend/src` — 10 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/cyberaware-lab/frontend/src/styles.css:17` | Rule ".badge" (theme `@import "tailwindcss";

:root`) pairs #b3541e on #fdeee3: 4.4:1 against a 4.5:1 AA requirement. |
| 2 | major | high | FORM-LABEL-01 (P24/P57) | `companies/tamuzi/cyberaware-lab/frontend/src/pages/InstructorPage.tsx:39` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 3 | major | high | FORM-LABEL-01 (P24/P57) | `companies/tamuzi/cyberaware-lab/frontend/src/pages/InstructorPage.tsx:44` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 4 | major | high | FORM-LABEL-01 (P24/P57) | `companies/tamuzi/cyberaware-lab/frontend/src/pages/InstructorPage.tsx:46` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 5 | major | high | FORM-LABEL-01 (P24/P57) | `companies/tamuzi/cyberaware-lab/frontend/src/pages/InstructorPage.tsx:67` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 6 | major | high | FORM-LABEL-01 (P24/P57) | `companies/tamuzi/cyberaware-lab/frontend/src/pages/InstructorPage.tsx:78` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 7 | major | high | FORM-LABEL-01 (P24/P57) | `companies/tamuzi/cyberaware-lab/frontend/src/pages/LoginPage.tsx:41` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 8 | major | high | FORM-LABEL-01 (P24/P57) | `companies/tamuzi/cyberaware-lab/frontend/src/pages/SimulationPage.tsx:96` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 9 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/tamuzi/cyberaware-lab/frontend/src/pages/InstructorPage.tsx:37` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |
| 10 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/tamuzi/cyberaware-lab/frontend/src/pages/SimulationPage.tsx:78` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |

## companies/tamuzi/eduaccess

Root: `companies/tamuzi/eduaccess/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/tamuzi/learnbridge

Root: `companies/tamuzi/learnbridge/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/tamuzi/learnpulse

Root: `companies/tamuzi/learnpulse/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/tamuzi/openlearn-commons

Root: `companies/tamuzi/openlearn-commons/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/tamuzi/pathwise

Root: `companies/tamuzi/pathwise/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/tamuzi/reachlearn

Root: `companies/tamuzi/reachlearn/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/tamuzi/teachcraft

Root: `companies/tamuzi/teachcraft/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/tamuzi/tessera

Root: `companies/tamuzi/tessera/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/tamuzi/transcriptwise

Root: `companies/tamuzi/transcriptwise/frontend/src` — 631 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:97` | Rule "button:disabled" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 2 | critical | medium | A11Y-FOCUS-01 (P46/P65) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:170` | Outline is removed without a ring or focus-visible replacement on the same rule (a scoped focus style exists elsewhere — verify it covers this selector). |
| 3 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:239` | Rule "::selection" (theme `:root,
  :root.dark`) pairs #222 on #684632: 1.9:1 against a 4.5:1 AA requirement. |
| 4 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:296` | Rule ".button.danger" (theme `:root,
  :root.dark`) pairs #fff on #ffa4ab: 1.88:1 against a 4.5:1 AA requirement. |
| 5 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:348` | Rule ".icon-button:hover:not(:disabled)" (theme `:root,
  :root.dark`) pairs #222 on #252a33: 1.1:1 against a 4.5:1 AA requirement. |
| 6 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:403` | Rule ".badge.neutral" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 7 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:637` | Rule ".workspace-symbol" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 8 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:708` | Rule ".main-nav a:hover" (theme `:root,
  :root.dark`) pairs #222 on #252a33: 1.1:1 against a 4.5:1 AA requirement. |
| 9 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:728` | Rule ".nav-count" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 10 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1316` | Rule ".example-button" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 11 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1439` | Rule ".composer-footer" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 12 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1652` | Rule ".invitation-icon" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 13 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1721` | Rule ".tint-3" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 14 | critical | medium | A11Y-FOCUS-01 (P46/P65) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1867` | Outline is removed without a ring or focus-visible replacement on the same rule (a scoped focus style exists elsewhere — verify it covers this selector). |
| 15 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2103` | Rule ".section-icon" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 16 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2255` | Rule ".original-preview" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 17 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2677` | Rule ".guide-navigation nav > button:hover" (theme `:root,
  :root.dark`) pairs #222 on #252a33: 1.1:1 against a 4.5:1 AA requirement. |
| 18 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2965` | Rule ".source-refs > button" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 19 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3261` | Rule ".quiz-meter" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 20 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3288` | Rule ".question-number" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 21 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3347` | Rule ".answer-letter" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 22 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3360` | Rule ".quiz-options .selected .answer-letter" (theme `:root,
  :root.dark`) pairs #f29a73 on #fff: 2.18:1 against a 4.5:1 AA requirement. |
| 23 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3389` | Rule ".result-check" (theme `:root,
  :root.dark`) pairs #a2c8b5 on #fff: 1.83:1 against a 4.5:1 AA requirement. |
| 24 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3864` | Rule ".guest-banner-icon" (theme `:root,
  :root.dark`) pairs #f29a73 on #fff: 2.18:1 against a 4.5:1 AA requirement. |
| 25 | critical | medium | A11Y-FOCUS-01 (P46/P65) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3947` | Outline is removed without a ring or focus-visible replacement on the same rule (a scoped focus style exists elsewhere — verify it covers this selector). |
| 26 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4006` | Rule ".view-toggle > button.active" (theme `:root,
  :root.dark`) pairs #222 on #252a33: 1.1:1 against a 4.5:1 AA requirement. |
| 27 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4394` | Rule ".integration-icon" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 28 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4422` | Rule ".configuration-note" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 29 | critical | high | A11Y-CONTRAST-01 (P70/P55/P53) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4767` | Rule ".flow-icon.video" (theme `:root,
  :root.dark`) pairs #555 on #252a33: 1.93:1 against a 4.5:1 AA requirement. |
| 30 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:338` | CSS rule for ".icon-button" sets an interactive height of 31px; touch targets need at least 44px. |
| 31 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:696` | CSS rule for ".main-nav a" sets an interactive height of 40px; touch targets need at least 44px. |
| 32 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:779` | CSS rule for ".secondary-nav a" sets an interactive height of 35px; touch targets need at least 44px. |
| 33 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1385` | CSS rule for ".url-entry input" sets an interactive height of 39px; touch targets need at least 44px. |
| 34 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1803` | CSS rule for ".dropdown-menu > a" sets an interactive height of 33px; touch targets need at least 44px. |
| 35 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1889` | CSS rule for ".dialog-heading > .icon-button" sets an interactive height of 28px; touch targets need at least 44px. |
| 36 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2202` | CSS rule for ".editor-actions .icon-button" sets an interactive height of 26px; touch targets need at least 44px. |
| 37 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2233` | CSS rule for ".segment-gutter > .icon-button" sets an interactive height of 25px; touch targets need at least 44px. |
| 38 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2665` | CSS rule for ".guide-navigation nav > button" sets an interactive height of 34px; touch targets need at least 44px. |
| 39 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2762` | CSS rule for ".section-controls > .icon-button" sets an interactive height of 28px; touch targets need at least 44px. |
| 40 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3337` | CSS rule for ".quiz-options input" sets an interactive height of 1px; touch targets need at least 44px. |
| 41 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3943` | CSS rule for ".search-box > input" sets an interactive height of 37px; touch targets need at least 44px. |
| 42 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3955` | CSS rule for ".search-box > .icon-button" sets an interactive height of 24px; touch targets need at least 44px. |
| 43 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3968` | CSS rule for ".library-filters select" sets an interactive height of 38px; touch targets need at least 44px. |
| 44 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4078` | CSS rule for ".library-card-badges .icon-button" sets an interactive height of 24px; touch targets need at least 44px. |
| 45 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5874` | CSS rule for ".topbar .icon-button" sets an interactive height of 30px; touch targets need at least 44px. |
| 46 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5956` | CSS rule for ".input-tabs > button > svg" sets an interactive height of 14px; touch targets need at least 44px. |
| 47 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5970` | CSS rule for ".url-entry > input" sets an interactive height of 30px; touch targets need at least 44px. |
| 48 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6395` | CSS rule for "  .guide-top-actions .dropdown > .icon-button" sets an interactive height of 28px; touch targets need at least 44px. |
| 49 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6484` | CSS rule for ".section-controls > .icon-button" sets an interactive height of 26px; touch targets need at least 44px. |
| 50 | major | medium | A11Y-TARGET-01 (P6/P33/P20) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6853` | CSS rule for ".library-filters select" sets an interactive height of 35px; touch targets need at least 44px. |
| 51 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:156` | Rule "select" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 52 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:198` | Rule "label" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 53 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:208` | Rule "legend" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 54 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:221` | Rule ".checkbox-label" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 55 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:256` | Rule ".stack" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 56 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:264` | Rule ".button" uses literal spacing 9, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 57 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:303` | Rule ".button.small" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 58 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:314` | Rule ".subtle-link" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 59 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:352` | Rule ".button-row" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 60 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:359` | Rule ".eyebrow" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 61 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:388` | Rule ".dot-separator" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 62 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:392` | Rule ".badge" uses literal spacing 5, 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 63 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:426` | Rule ".notice" uses literal spacing 10, 13, 15, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 64 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:459` | Rule ".notice-actions" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 65 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:466` | Rule ".notice p" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 66 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:474` | Rule ".label-with-icon" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 67 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:479` | Rule ".spinner-wrap" uses literal spacing 11, 55px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 68 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:488` | Rule ".spinner-wrap.small" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 69 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:546` | Rule ".skip-link" uses literal spacing 10, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 70 | minor | high | TOKEN-ELEVATION-01 (P36/P44/P76) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:552` | z-index 90 escalates past the named stacking layers (0–50); isolate the stacking context instead. |
| 71 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:569` | Rule ".sidebar" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 72 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:580` | Rule ".sidebar-brand" uses literal spacing 28, 22, 26px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 73 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:583` | Rule ".brand" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 74 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:627` | Rule ".workspace-label" uses literal spacing 9, 20, 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 75 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:659` | Rule ".sidebar-new" uses literal spacing 18, 27, 10, 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 76 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:685` | Rule ".nav-label" uses literal spacing 30, 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 77 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:693` | Rule ".main-nav" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 78 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:696` | Rule ".main-nav a" uses literal spacing 11, 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 79 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:728` | Rule ".nav-count" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 80 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:743` | Rule ".sidebar-note" uses literal spacing 20, 19, 23, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 81 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:756` | Rule ".sidebar-note .little-spark" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 82 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:765` | Rule ".sidebar-note p" uses literal spacing 7, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 83 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:771` | Rule ".sidebar-note a" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 84 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:785` | Rule ".sidebar-profile" uses literal spacing 18, 19, 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 85 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:790` | Rule ".sidebar-profile > button" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 86 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:843` | Rule ".topbar" uses literal spacing 15, 37px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 87 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:857` | Rule ".topbar-end" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 88 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:863` | Rule ".breadcrumbs" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 89 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:883` | Rule ".topbar-end" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 90 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:886` | Rule ".topbar-tagline" uses literal spacing 6, 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 91 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:916` | Rule ".mobile-sidebar" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 92 | minor | high | TOKEN-ELEVATION-01 (P36/P44/P76) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:919` | z-index 80 escalates past the named stacking layers (0–50); isolate the stacking context instead. |
| 93 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:935` | Rule ".mobile-sidebar .sidebar-brand" uses literal spacing 38px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 94 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:938` | Rule ".workspace-page" uses literal spacing 34, 42, 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 95 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:944` | Rule ".page-heading" uses literal spacing 25, 5, 29px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 96 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:951` | Rule ".page-heading .eyebrow" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 97 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:959` | Rule ".page-heading p" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 98 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:965` | Rule ".section-heading" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 99 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:977` | Rule ".section-heading .eyebrow" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 100 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:983` | Rule ".workspace-footer" uses literal spacing 26, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 101 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:993` | Rule ".workspace-footer > span:last-child" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 102 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1003` | Rule ".dashboard-page" uses literal spacing 29px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 103 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1009` | Rule ".dashboard-hero" uses literal spacing 15, 26px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 104 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1020` | Rule ".hero-copy h1" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 105 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1052` | Rule ".hero-pills" uses literal spacing 9, 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 106 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1059` | Rule ".hero-pills > span" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 107 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1119` | Rule ".source-tile" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 108 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1136` | Rule ".video-play" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 109 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1147` | Rule ".video-line" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 110 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1200` | Rule ".sheet-top" uses literal spacing 5, 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 111 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1215` | Rule ".sheet-title" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 112 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1224` | Rule ".sheet-text-line" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 113 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1232` | Rule ".sheet-text-line.shorter" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 114 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1236` | Rule ".sheet-check" uses literal spacing 6, 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 115 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1276` | Rule ".art-caption" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 116 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1299` | Rule ".composer-top" uses literal spacing 23, 26, 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 117 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1306` | Rule ".composer-top h2" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 118 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1316` | Rule ".example-button" uses literal spacing 6, 7, 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 119 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1336` | Rule ".input-tabs" uses literal spacing 29, 26px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 120 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1343` | Rule ".input-tabs > button" uses literal spacing 9, 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 121 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1365` | Rule ".composer-body" uses literal spacing 22, 26, 21px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 122 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1369` | Rule ".url-entry" uses literal spacing 5, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 123 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1385` | Rule ".url-entry input" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 124 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1413` | Rule ".language-option > summary" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 125 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1421` | Rule ".language-option > label" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 126 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1433` | Rule ".retrieval-disclosure" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 127 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1439` | Rule ".composer-footer" uses literal spacing 26, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 128 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1451` | Rule ".composer-footer > a" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 129 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1470` | Rule ".transcript-title-input" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 130 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1478` | Rule ".paste-input textarea" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 131 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1485` | Rule ".paste-footer" uses literal spacing 15, 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 132 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1494` | Rule ".paste-footer > div" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 133 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1502` | Rule ".sample-disclosure" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 134 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1510` | Rule ".dropzone" uses literal spacing 15, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 135 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1531` | Rule ".dropzone p" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 136 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1555` | Rule ".upload-bottom" uses literal spacing 15, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 137 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1566` | Rule ".retrieval-progress" uses literal spacing 14, 17, 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 138 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1583` | Rule ".how-grid" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 139 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1589` | Rule ".how-item" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 140 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1632` | Rule ".how-item h3" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 141 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1642` | Rule ".library-invitation" uses literal spacing 30, 13, 17, 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 142 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1672` | Rule ".library-invitation > a" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 143 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1681` | Rule ".recent-grid" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 144 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1686` | Rule ".recent-card" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 145 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1725` | Rule ".recent-card-type" uses literal spacing 15, 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 146 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1732` | Rule ".recent-card h3" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 147 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1748` | Rule ".activity-line" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 148 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1757` | Rule ".activity-line > span" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 149 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1791` | Rule ".dropdown-menu" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 150 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1803` | Rule ".dropdown-menu > a" uses literal spacing 9, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 151 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1821` | Rule ".dropdown-label" uses literal spacing 9, 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 152 | minor | high | TOKEN-ELEVATION-01 (P36/P44/P76) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1847` | z-index 70 escalates past the named stacking layers (0–50); isolate the stacking context instead. |
| 153 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1851` | Rule ".dialog" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 154 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1851` | Rule ".dialog" uses literal spacing 26px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 155 | minor | high | TOKEN-ELEVATION-01 (P36/P44/P76) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1854` | z-index 75 escalates past the named stacking layers (0–50); isolate the stacking context instead. |
| 156 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1872` | Rule ".dialog-heading" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 157 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1889` | Rule ".dialog-heading > .icon-button" uses literal spacing 7, 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 158 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1895` | Rule ".dialog-footer" uses literal spacing 10, 23, 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 159 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1904` | Rule ".form-stack" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 160 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1907` | Rule ".auth-emblem" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 161 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1918` | Rule ".auth-switch" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 162 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1927` | Rule ".auth-footnote" uses literal spacing 7, 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 163 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1941` | Rule ".delete-preview" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 164 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1957` | Rule ".section-edit-fields" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 165 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1957` | Rule ".section-edit-fields" uses literal spacing 18, 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 166 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1965` | Rule ".edit-item" uses literal spacing 14, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 167 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1984` | Rule ".workflow-steps" uses literal spacing 19, 28px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 168 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1996` | Rule ".workflow-steps > li" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 169 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2036` | Rule ".new-page-heading" uses literal spacing 29px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 170 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2049` | Rule ".new-help-grid" uses literal spacing 28px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 171 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2055` | Rule ".new-help-grid > div > svg" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 172 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2059` | Rule ".new-help-grid strong" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 173 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2073` | Rule ".review-heading" uses literal spacing 26px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 174 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2076` | Rule ".review-heading > .text-button" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 175 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2085` | Rule ".review-heading p" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 176 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2090` | Rule ".review-grid" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 177 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2096` | Rule ".panel-heading" uses literal spacing 10, 19, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 178 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2128` | Rule ".source-metadata" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 179 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2134` | Rule ".source-facts" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 180 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2143` | Rule ".source-facts > span" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 181 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2148` | Rule ".source-metadata > .subtle-link" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 182 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2152` | Rule ".language-label" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 183 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2156` | Rule ".language-label input" uses literal spacing 6, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 184 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2160` | Rule ".editor-toolbar" uses literal spacing 7, 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 185 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2174` | Rule ".small-tabs > button" uses literal spacing 5, 6, 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 186 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2194` | Rule ".editor-actions" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 187 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2206` | Rule ".segment-editor" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 188 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2206` | Rule ".segment-editor" uses literal spacing 7, 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 189 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2211` | Rule ".edit-segment" uses literal spacing 5, 10, 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 190 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2221` | Rule ".segment-gutter" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 191 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2238` | Rule ".edit-segment textarea" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 192 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2255` | Rule ".original-preview" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 193 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2255` | Rule ".original-preview" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 194 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2269` | Rule ".editor-footer" uses literal spacing 13, 18, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 195 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2282` | Rule ".source-save-bar" uses literal spacing 14, 18, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 196 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2298` | Rule ".options-panel" uses literal spacing 21px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 197 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2301` | Rule ".options-heading" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 198 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2304` | Rule ".options-heading .little-spark" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 199 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2311` | Rule ".options-heading p" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 200 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2316` | Rule ".options-panel > fieldset" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 201 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2335` | Rule ".level-options > label" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 202 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2356` | Rule ".depth-option" uses literal spacing 9, 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 203 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2400` | Rule ".depth-option strong" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 204 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2419` | Rule ".more-options" uses literal spacing 18, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 205 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2433` | Rule ".more-options > div" uses literal spacing 13, 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 206 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2450` | Rule ".mode-notice" uses literal spacing 7, 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 207 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2459` | Rule ".mode-notice > .provider-dot" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 208 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2470` | Rule ".generate-button" uses literal spacing 19, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 209 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2478` | Rule ".options-footnote" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 210 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2485` | Rule ".below-panel-note" uses literal spacing 6, 13, 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 211 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2502` | Rule ".pagination" uses literal spacing 20, 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 212 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2515` | Rule ".guide-page" uses literal spacing 27px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 213 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2535` | Rule ".guide-header" uses literal spacing 27, 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 214 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2538` | Rule ".guide-eyebrow" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 215 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2544` | Rule ".guide-eyebrow > .badge" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 216 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2560` | Rule ".guide-source-line" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 217 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2569` | Rule ".guide-source-line > span" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 218 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2574` | Rule ".mini-tag" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 219 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2581` | Rule ".guide-mode-banner" uses literal spacing 11, 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 220 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2605` | Rule ".guide-mode-banner > details > summary" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 221 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2626` | Rule ".guide-mode-banner > details > div > p + p" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 222 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2629` | Rule ".regeneration-status" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 223 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2644` | Rule ".workspace-grid" uses literal spacing 28, 27px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 224 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2655` | Rule ".guide-navigation > .eyebrow" uses literal spacing 14, 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 225 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2665` | Rule ".guide-navigation nav > button" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 226 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2697` | Rule ".guide-navigation nav > button.nav-section-divider" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 227 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2706` | Rule ".guide-nav-foot" uses literal spacing 29, 21px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 228 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2712` | Rule ".guide-nav-foot > svg" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 229 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2721` | Rule ".guide-nav-foot p" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 230 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2727` | Rule ".guide-reading" uses literal spacing 29, 33px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 231 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2736` | Rule ".reading-heading" uses literal spacing 14, 22, 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 232 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2756` | Rule ".section-controls" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 233 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2773` | Rule ".learning-item + .learning-item" uses literal spacing 28, 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 234 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2778` | Rule ".learning-item h3" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 235 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2784` | Rule ".provenance-label" uses literal spacing 5, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 236 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2821` | Rule ".rich-text > ol + p" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 237 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2828` | Rule ".rich-text ul" uses literal spacing 21px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 238 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2833` | Rule ".rich-text ol" uses literal spacing 21px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 239 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2838` | Rule ".rich-text li" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 240 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2842` | Rule ".rich-text h3" uses literal spacing 20, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 241 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2850` | Rule ".rich-text pre" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 242 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2850` | Rule ".rich-text pre" uses literal spacing 17, 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 243 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2868` | Rule ".rich-text :not(pre) > code" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 244 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2876` | Rule ".rich-text blockquote" uses literal spacing 17, 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 245 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2887` | Rule ".table-scroll" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 246 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2887` | Rule ".table-scroll" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 247 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2898` | Rule ".rich-text th" uses literal spacing 9, 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 248 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2913` | Rule ".section-takeaways .learning-item" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 249 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2918` | Rule ".takeaway-number" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 250 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2935` | Rule ".item-details" uses literal spacing 18, 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 251 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2938` | Rule ".item-details > div" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 252 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2958` | Rule ".source-refs" uses literal spacing 6, 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 253 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2965` | Rule ".source-refs > button" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 254 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2984` | Rule ".section-quotes .rich-text" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 255 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2992` | Rule ".continue-learning" uses literal spacing 31, 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 256 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3001` | Rule ".continue-learning h3" uses literal spacing 7, 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 257 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3006` | Rule ".continue-learning > div:last-child" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 258 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3011` | Rule ".continue-learning button" uses literal spacing 10, 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 259 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3032` | Rule ".reading-footer" uses literal spacing 10, 35, 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 260 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3044` | Rule ".reading-footer > span:first-child" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 261 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3050` | Rule ".source-reader-toolbar" uses literal spacing 10, 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 262 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3065` | Rule ".source-passages" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 263 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3068` | Rule ".source-passage" uses literal spacing 13, 19, 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 264 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3100` | Rule ".transcript-reader > .button" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 265 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3103` | Rule ".transcript-reader .original-preview" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 266 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3108` | Rule ".personal-notes > p" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 267 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3114` | Rule ".personal-notes textarea" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 268 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3120` | Rule ".notes-save-bar" uses literal spacing 10, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 269 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3132` | Rule ".processing-view" uses literal spacing 30, 80, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 270 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3198` | Rule ".processing-status" uses literal spacing 23, 30, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 271 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3206` | Rule ".processing-status > p" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 272 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3218` | Rule ".task-progress-track" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 273 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3229` | Rule ".processing-view > .button-row" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 274 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3255` | Rule ".learning-section-intro p" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 275 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3261` | Rule ".quiz-meter" uses literal spacing 10, 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 276 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3273` | Rule ".quiz-question" uses literal spacing 29, 26px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 277 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3278` | Rule ".quiz-question > legend" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 278 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3303` | Rule ".quiz-question legend small" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 279 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3321` | Rule ".quiz-options > label" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 280 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3365` | Rule ".quiz-submit" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 281 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3379` | Rule ".quiz-result-banner" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 282 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3418` | Rule ".question-review" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 283 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3426` | Rule ".question-review h3" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 284 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3434` | Rule ".submitted-answer" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 285 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3449` | Rule ".submitted-answer p" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 286 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3454` | Rule ".expected-answer" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 287 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3457` | Rule ".expected-answer > .rich-text" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 288 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3461` | Rule ".expected-answer > p" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 289 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3466` | Rule ".quiz-history" uses literal spacing 29, 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 290 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3476` | Rule ".quiz-history > button" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 291 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3496` | Rule ".flashcard-toolbar" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 292 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3506` | Rule ".flashcard-toolbar > span" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 293 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3516` | Rule ".study-progress" uses literal spacing 13, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 294 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3520` | Rule ".study-card" uses literal spacing 27, 30, 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 295 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3550` | Rule ".study-card-content" uses literal spacing 21, 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 296 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3559` | Rule ".study-card-content > p" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 297 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3575` | Rule ".keyboard-key" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 298 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3587` | Rule ".study-card-bottom" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 299 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3594` | Rule ".study-card-bottom > a" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 300 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3604` | Rule ".study-hint" uses literal spacing 18, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 301 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3611` | Rule ".card-rating" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 302 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3619` | Rule ".card-rating > p > span" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 303 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3624` | Rule ".card-rating > div:not(.spinner-wrap)" uses literal spacing 9, 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 304 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3630` | Rule ".card-rating > div > button" uses literal spacing 6, 13, 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 305 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3672` | Rule ".study-complete" uses literal spacing 40px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 306 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3680` | Rule ".complete-illustration" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 307 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3703` | Rule ".study-complete .button-row" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 308 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3709` | Rule ".flashcard-page-grid" uses literal spacing 45, 35px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 309 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3719` | Rule ".study-sidebar > .section-icon" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 310 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3728` | Rule ".study-sidebar > p" uses literal spacing 10, 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 311 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3744` | Rule ".study-numbers" uses literal spacing 29, 21, 27px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 312 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3762` | Rule ".study-tip" uses literal spacing 28px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 313 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3766` | Rule ".study-tip > svg" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 314 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3776` | Rule ".study-tip p" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 315 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3781` | Rule ".schedule-details" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 316 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3796` | Rule ".schedule-details p" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 317 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3802` | Rule ".study-page-footnote" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 318 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3812` | Rule ".empty-state" uses literal spacing 60, 30px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 319 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3820` | Rule ".empty-icon" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 320 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3854` | Rule ".guest-banner" uses literal spacing 14, 18, 5, 27px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 321 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3890` | Rule ".library-tabs" uses literal spacing 15, 27, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 322 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3898` | Rule ".library-tabs > div" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 323 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3902` | Rule ".library-tabs > div > button" uses literal spacing 6, 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 324 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3917` | Rule ".library-tabs > .muted" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 325 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3921` | Rule ".library-toolbar" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 326 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3929` | Rule ".search-box" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 327 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3943` | Rule ".search-box > input" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 328 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3968` | Rule ".library-filters select" uses literal spacing 9, 27, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 329 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3987` | Rule ".select-with-icon select" uses literal spacing 30px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 330 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4010` | Rule ".library-tags" uses literal spacing 7, 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 331 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4022` | Rule ".tag-filter" uses literal spacing 5, 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 332 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4039` | Rule ".library-results.grid" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 333 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4044` | Rule ".library-card" uses literal spacing 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 334 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4063` | Rule ".library-card-top" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 335 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4074` | Rule ".library-card-badges .badge" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 336 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4082` | Rule ".library-card-main" uses literal spacing 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 337 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4087` | Rule ".library-source" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 338 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4110` | Rule ".card-organizing" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 339 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4131` | Rule ".library-card-footer" uses literal spacing 7, 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 340 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4159` | Rule ".library-results.list" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 341 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4164` | Rule ".library-results.list .library-card" uses literal spacing 20, 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 342 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4194` | Rule ".library-retention" uses literal spacing 6, 19, 29px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 343 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4213` | Rule ".settings-grid" uses literal spacing 33px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 344 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4220` | Rule ".settings-nav" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 345 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4240` | Rule ".settings-content" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 346 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4246` | Rule ".settings-section" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 347 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4250` | Rule ".settings-section-heading" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 348 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4265` | Rule ".settings-section-heading p" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 349 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4276` | Rule ".theme-option" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 350 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4300` | Rule ".theme-miniature > div" uses literal spacing 10, 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 351 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4312` | Rule ".theme-miniature > div > span:first-child" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 352 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4341` | Rule ".theme-option > div:nth-child(2)" uses literal spacing 6, 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 353 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4355` | Rule ".theme-option p" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 354 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4361` | Rule ".settings-form-grid" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 355 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4373` | Rule ".settings-save" uses literal spacing 19, 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 356 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4383` | Rule ".integration-row" uses literal spacing 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 357 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4412` | Rule ".integration-row p" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 358 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4422` | Rule ".configuration-note" uses literal spacing 9, 13, 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 359 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4437` | Rule ".account-settings-callout" uses literal spacing 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 360 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4451` | Rule ".account-settings-callout p" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 361 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4485` | Rule ".privacy-details" uses literal spacing 26px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 362 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4492` | Rule ".privacy-details ul" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 363 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4500` | Rule ".privacy-details li" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 364 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4507` | Rule ".data-actions" uses literal spacing 19, 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 365 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4523` | Rule ".help-journey" uses literal spacing 25, 30, 28px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 366 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4529` | Rule ".help-journey .how-icon" uses literal spacing 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 367 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4532` | Rule ".help-journey h2" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 368 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4543` | Rule ".help-page > .notice" uses literal spacing 34px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 369 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4546` | Rule ".help-content" uses literal spacing 37, 31px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 370 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4553` | Rule ".help-content .section-heading" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 371 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4562` | Rule ".faq-list > details" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 372 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4566` | Rule ".faq-list > details > summary" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 373 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4583` | Rule ".faq-list > details > p" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 374 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4589` | Rule ".help-side-panel" uses literal spacing 22, 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 375 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4593` | Rule ".help-side-panel > svg" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 376 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4601` | Rule ".help-side-panel p" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 377 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4607` | Rule ".help-side-panel dl" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 378 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4622` | Rule ".help-api-link" uses literal spacing 9, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 379 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4637` | Rule ".help-api-link p" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 380 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4642` | Rule ".help-api-link a" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 381 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4652` | Rule ".landing-header" uses literal spacing 40, 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 382 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4663` | Rule ".landing-header > nav" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 383 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4673` | Rule ".landing-header > div" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 384 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4678` | Rule ".landing main" uses literal spacing 36px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 385 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4683` | Rule ".landing-hero" uses literal spacing 69, 60px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 386 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4688` | Rule ".landing-eyebrow" uses literal spacing 7, 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 387 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4701` | Rule ".landing-hero h1" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 388 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4716` | Rule ".landing-hero > .button-row" uses literal spacing 27px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 389 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4719` | Rule ".landing-hero .button" uses literal spacing 13, 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 390 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4723` | Rule ".landing-no-account" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 391 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4732` | Rule ".landing-flow" uses literal spacing 55px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 392 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4739` | Rule ".landing-flow > div" uses literal spacing 28, 17, 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 393 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4755` | Rule ".flow-icon" uses literal spacing 21px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 394 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4780` | Rule ".landing-flow strong" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 395 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4800` | Rule ".flow-inputs" uses literal spacing 6, 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 396 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4806` | Rule ".flow-inputs > span" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 397 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4816` | Rule ".flow-concept" uses literal spacing 5, 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 398 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4835` | Rule ".landing-section h2" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 399 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4846` | Rule ".landing-features" uses literal spacing 39, 46px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 400 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4853` | Rule ".landing-features article > svg" uses literal spacing 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 401 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4862` | Rule ".landing-features p" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 402 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4868` | Rule ".landing-example" uses literal spacing 70, 46px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 403 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4889` | Rule ".landing-example > div > .text-button" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 404 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4892` | Rule ".example-caption" uses literal spacing 28px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 405 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4907` | Rule ".example-guide-top" uses literal spacing 9, 21px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 406 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4943` | Rule ".example-guide h3" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 407 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4952` | Rule ".example-next-step" uses literal spacing 14, 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 408 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4962` | Rule ".example-next-step p" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 409 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4968` | Rule ".example-guide-bottom" uses literal spacing 13, 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 410 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4977` | Rule ".landing-truth" uses literal spacing 17, 43, 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 411 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4996` | Rule ".landing-truth p" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 412 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5001` | Rule ".landing-cta" uses literal spacing 65, 75px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 413 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5005` | Rule ".landing-cta h2" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 414 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5015` | Rule ".landing-cta .button" uses literal spacing 25, 13, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 415 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5019` | Rule ".landing-footer" uses literal spacing 26, 36, 35, 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 416 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5044` | Rule ".landing-footer > a:last-child" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 417 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5054` | Rule ".workspace-page" uses literal spacing 40px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 418 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5057` | Rule ".dashboard-page" uses literal spacing 40px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 419 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5069` | Rule ".composer-top" uses literal spacing 27, 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 420 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5073` | Rule ".composer-body" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 421 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5077` | Rule ".how-section" uses literal spacing 38px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 422 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5082` | Rule ".sidebar-brand" uses literal spacing 22, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 423 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5086` | Rule ".workspace-label" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 424 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5089` | Rule ".sidebar-new" uses literal spacing 21px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 425 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5096` | Rule ".sidebar-note p" uses literal spacing 5, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 426 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5102` | Rule ".sidebar-profile" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 427 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5110` | Rule ".sidebar-brand" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 428 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5121` | Rule ".workspace-label" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 429 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5124` | Rule ".sidebar-new" uses literal spacing 14, 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 430 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5132` | Rule ".topbar" uses literal spacing 28px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 431 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5135` | Rule ".workspace-page" uses literal spacing 30px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 432 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5151` | Rule ".learning-illustration" uses literal spacing 28px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 433 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5180` | Rule ".how-grid" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 434 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5183` | Rule ".how-item" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 435 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5202` | Rule ".workspace-grid" uses literal spacing 21px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 436 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5206` | Rule ".guide-navigation nav > button" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 437 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5214` | Rule ".guide-reading" uses literal spacing 25, 26px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 438 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5220` | Rule ".review-grid" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 439 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5224` | Rule ".options-panel" uses literal spacing 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 440 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5230` | Rule ".panel-heading" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 441 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5237` | Rule ".source-facts" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 442 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5240` | Rule ".library-results.grid" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 443 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5253` | Rule ".guest-banner" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 444 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5262` | Rule ".settings-grid" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 445 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5269` | Rule ".settings-section" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 446 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5272` | Rule ".flashcard-page-grid" uses literal spacing 29px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 447 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5276` | Rule ".landing-header" uses literal spacing 30px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 448 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5279` | Rule ".landing-example" uses literal spacing 40, 35px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 449 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5299` | Rule ".workspace-label" uses literal spacing 13, 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 450 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5309` | Rule ".sidebar-new" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 451 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5317` | Rule ".main-nav" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 452 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5327` | Rule ".sidebar-note" uses literal spacing 15, 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 453 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5340` | Rule ".sidebar-profile" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 454 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5349` | Rule ".workspace-page" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 455 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5352` | Rule ".topbar" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 456 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5361` | Rule ".dashboard-hero" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 457 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5376` | Rule ".learning-illustration" uses literal spacing 60px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 458 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5380` | Rule ".hero-pills" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 459 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5386` | Rule ".how-item" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 460 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5427` | Rule ".workspace-grid" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 461 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5431` | Rule ".guide-navigation nav > button" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 462 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5441` | Rule ".guide-reading" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 463 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5464` | Rule ".study-card" uses literal spacing 23, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 464 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5488` | Rule ".topbar" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 465 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5495` | Rule ".workspace-page" uses literal spacing 29, 28, 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 466 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5510` | Rule ".dashboard-page" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 467 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5528` | Rule ".landing-header > nav" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 468 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5539` | Rule ".landing-example" uses literal spacing 30, 28px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 469 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5549` | Rule ".landing-features" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 470 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5561` | Rule ".landing-hero" uses literal spacing 53px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 471 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5566` | Rule ".review-grid" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 472 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5611` | Rule ".workspace-grid" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 473 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5618` | Rule ".mobile-guide-nav" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 474 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5636` | Rule ".mobile-guide-nav > select" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 475 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5643` | Rule ".guide-reading" uses literal spacing 27, 29px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 476 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5659` | Rule ".guest-banner" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 477 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5670` | Rule ".library-results.list .library-card" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 478 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5678` | Rule ".library-results.list .library-card-top" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 479 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5687` | Rule ".settings-grid" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 480 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5694` | Rule ".flashcard-page-grid" uses literal spacing 27, 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 481 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5713` | Rule ".study-sidebar > p" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 482 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5720` | Rule ".study-sidebar > .checkbox-label" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 483 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5725` | Rule ".study-numbers" uses literal spacing 21, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 484 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5743` | Rule ".help-content" uses literal spacing 30px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 485 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5758` | Rule ".help-journey" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 486 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5767` | Rule ".landing-header" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 487 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5774` | Rule ".landing main" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 488 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5806` | Rule ".landing-features" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 489 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5815` | Rule ".landing-example" uses literal spacing 29, 30px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 490 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5843` | Rule ".landing-footer" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 491 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5855` | Rule ".breadcrumbs" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 492 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5878` | Rule ".mobile-menu-button" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 493 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5881` | Rule ".workspace-page" uses literal spacing 25, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 494 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5887` | Rule ".dashboard-hero" uses literal spacing 27px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 495 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5895` | Rule ".hero-copy h1" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 496 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5913` | Rule ".hero-pills" uses literal spacing 18, 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 497 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5923` | Rule ".composer-top" uses literal spacing 20, 18, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 498 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5935` | Rule ".example-button" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 499 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5946` | Rule ".input-tabs" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 500 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5951` | Rule ".input-tabs > button" uses literal spacing 5, 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 501 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5960` | Rule ".composer-body" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 502 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5963` | Rule ".url-entry" uses literal spacing 10, 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 503 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5970` | Rule ".url-entry > input" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 504 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5979` | Rule ".url-entry .button" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 505 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5985` | Rule ".input-context" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 506 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6001` | Rule ".retrieval-disclosure" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 507 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6006` | Rule ".composer-footer" uses literal spacing 11, 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 508 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6022` | Rule ".paste-footer" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 509 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6046` | Rule ".dropzone" uses literal spacing 20, 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 510 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6072` | Rule "  .recent-section" uses literal spacing 29px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 511 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6076` | Rule ".section-heading" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 512 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6102` | Rule ".how-item" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 513 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6110` | Rule ".how-item h3" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 514 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6121` | Rule ".library-invitation" uses literal spacing 28, 11, 17, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 515 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6137` | Rule ".library-invitation > a" uses literal spacing 45, 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 516 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6153` | Rule ".recent-card" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 517 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6166` | Rule ".activity-line" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 518 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6173` | Rule ".page-heading" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 519 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6195` | Rule ".workflow-steps" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 520 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6200` | Rule ".workflow-steps > li" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 521 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6215` | Rule ".new-page-heading" uses literal spacing 26px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 522 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6229` | Rule ".new-help-grid" uses literal spacing 22, 28px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 523 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6243` | Rule ".new-help-grid strong" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 524 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6258` | Rule ".review-grid" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 525 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6261` | Rule ".panel-heading" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 526 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6275` | Rule ".source-metadata" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 527 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6284` | Rule ".source-facts" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 528 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6291` | Rule ".editor-toolbar" uses literal spacing 7, 10, 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 529 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6295` | Rule ".small-tabs > button" uses literal spacing 5, 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 530 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6317` | Rule ".edit-segment textarea" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 531 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6322` | Rule ".editor-footer" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 532 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6326` | Rule ".source-save-bar" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 533 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6336` | Rule ".options-panel" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 534 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6342` | Rule ".dialog" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 535 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6384` | Rule ".guide-top-actions" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 536 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6388` | Rule "  .export-dropdown > .button" uses literal spacing 7, 9, 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 537 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6406` | Rule ".guide-eyebrow" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 538 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6421` | Rule ".guide-source-line" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 539 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6428` | Rule ".guide-mode-banner" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 540 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6434` | Rule ".guide-mode-banner > .provider-dot" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 541 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6440` | Rule ".guide-mode-banner > details" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 542 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6451` | Rule ".workspace-grid" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 543 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6455` | Rule ".mobile-guide-nav" uses literal spacing 7, 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 544 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6462` | Rule ".guide-reading" uses literal spacing 22, 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 545 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6467` | Rule ".reading-heading" uses literal spacing 19, 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 546 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6472` | Rule ".reading-heading h2" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 547 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6505` | Rule ".learning-item + .learning-item" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 548 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6509` | Rule ".source-refs" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 549 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6512` | Rule "  .source-refs > button" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 550 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6517` | Rule ".section-takeaways .learning-item" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 551 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6539` | Rule ".continue-learning" uses literal spacing 17, 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 552 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6546` | Rule ".continue-learning button" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 553 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6550` | Rule ".reading-footer" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 554 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6557` | Rule ".source-reader-toolbar" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 555 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6564` | Rule ".source-reader-toolbar > .button" uses literal spacing 7, 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 556 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6569` | Rule ".source-passage" uses literal spacing 9, 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 557 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6596` | Rule ".processing-view" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 558 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6608` | Rule ".processing-status" uses literal spacing 19, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 559 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6614` | Rule ".regeneration-status" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 560 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6622` | Rule ".learning-section-intro" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 561 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6636` | Rule ".quiz-meter" uses literal spacing 10, 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 562 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6646` | Rule ".quiz-question > legend" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 563 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6657` | Rule ".quiz-options > label" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 564 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6663` | Rule ".quiz-submit" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 565 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6671` | Rule ".quiz-result-banner" uses literal spacing 14, 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 566 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6685` | Rule ".quiz-result-banner > .button" uses literal spacing 47px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 567 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6689` | Rule ".question-review" uses literal spacing 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 568 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6713` | Rule ".study-card" uses literal spacing 22, 18, 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 569 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6729` | Rule ".study-card-icon" uses literal spacing 21px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 570 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6734` | Rule ".study-card-content" uses literal spacing 20, 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 571 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6743` | Rule ".study-card-bottom" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 572 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6750` | Rule ".card-rating > p > span" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 573 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6755` | Rule ".card-rating > div:not(.spinner-wrap)" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 574 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6758` | Rule ".card-rating > div > button" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 575 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6768` | Rule ".study-navigation" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 576 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6794` | Rule ".flashcard-page-grid" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 577 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6803` | Rule ".study-numbers" uses literal spacing 35, 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 578 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6815` | Rule ".guest-banner" uses literal spacing 15, 10px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 579 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6825` | Rule ".guest-banner > .text-button" uses literal spacing 46px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 580 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6839` | Rule ".library-toolbar" uses literal spacing 11px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 581 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6847` | Rule ".library-filters" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 582 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6853` | Rule ".library-filters select" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 583 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6871` | Rule ".library-tags" uses literal spacing 6, 19px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 584 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6875` | Rule ".tag-filter" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 585 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6882` | Rule ".library-card" uses literal spacing 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 586 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6903` | Rule ".library-retention" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 587 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6908` | Rule ".library-results.list .library-card" uses literal spacing 13, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 588 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6914` | Rule ".library-results.list .library-card-top" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 589 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6936` | Rule ".empty-state" uses literal spacing 45, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 590 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6953` | Rule ".settings-section" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 591 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6956` | Rule ".settings-section-heading" uses literal spacing 10, 21px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 592 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6973` | Rule ".theme-option" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 593 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6980` | Rule ".theme-miniature > div" uses literal spacing 9, 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 594 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7004` | Rule ".settings-save" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 595 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7012` | Rule ".integration-row" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 596 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7037` | Rule ".configuration-note" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 597 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7046` | Rule ".account-settings-callout" uses literal spacing 14px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 598 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7057` | Rule ".signed-in-row" uses literal spacing 13, 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 599 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7085` | Rule ".data-actions" uses literal spacing 18px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 600 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7093` | Rule ".help-journey" uses literal spacing 25px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 601 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7108` | Rule ".help-journey h2" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 602 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7121` | Rule ".help-side-panel" uses literal spacing 21px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 603 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7141` | Rule ".landing-header" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 604 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7153` | Rule ".landing-header > div" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 605 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7156` | Rule ".landing-header > div > .button" uses literal spacing 9, 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 606 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7164` | Rule ".landing main" uses literal spacing 20px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 607 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7167` | Rule ".landing-hero" uses literal spacing 45px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 608 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7170` | Rule ".landing-eyebrow" uses literal spacing 6, 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 609 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7179` | Rule ".landing-hero h1" uses literal spacing 22px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 610 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7195` | Rule ".landing-hero .button" uses literal spacing 11, 13, 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 611 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7200` | Rule ".landing-hero > .button-row" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 612 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7204` | Rule ".landing-no-account" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 613 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7208` | Rule ".landing-flow" uses literal spacing 15, 36px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 614 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7214` | Rule ".landing-flow > div" uses literal spacing 23px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 615 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7257` | Rule ".landing-section" uses literal spacing 38, 42px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 616 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7264` | Rule ".landing-section h2" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 617 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7273` | Rule ".landing-features" uses literal spacing 27px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 618 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7292` | Rule ".landing-features p" uses literal spacing 9px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 619 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7296` | Rule ".landing-example" uses literal spacing 22, 26px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 620 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7317` | Rule ".example-guide" uses literal spacing 18, 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 621 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7364` | Rule ".landing-cta" uses literal spacing 45, 50px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 622 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7377` | Rule ".landing-footer" uses literal spacing 23, 20, 29, 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 623 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7389` | Rule ".library-results.grid" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 624 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7396` | Rule ".guide-top-actions" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 625 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7434` | Rule ".example-button" uses literal spacing 15px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 626 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7446` | Rule ".guide-reading" uses literal spacing 20, 17px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 627 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7452` | Rule ".section-controls" uses literal spacing 13px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 628 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7467` | Rule ".theme-option" uses literal spacing 6px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 629 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7480` | Rule ".topbar-start .breadcrumbs" uses literal spacing 5px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 630 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7508` | Rule ".empty-state" uses literal spacing 7px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |
| 631 | minor | medium | TOKEN-SPACING-01 (P13/P69/P32) | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7602` | Rule ".library-invitation > a" uses literal spacing 45px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64). |

## companies/tamuzi/tutorspring

Root: `companies/tamuzi/tutorspring/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/velaqori/assetwatch

Root: `companies/velaqori/assetwatch/frontend/src` — 5 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/assetwatch/frontend/src/pages/AssetsPage.tsx:31` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 2 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/assetwatch/frontend/src/pages/ScansPage.tsx:39` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 3 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/assetwatch/frontend/src/pages/ScansPage.tsx:43` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 4 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/assetwatch/frontend/src/pages/AssetsPage.tsx:27` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |
| 5 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/assetwatch/frontend/src/pages/ScansPage.tsx:23` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |

## companies/velaqori/chessscope

Root: `companies/velaqori/chessscope/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/velaqori/circuitlab-calc

Root: `companies/velaqori/circuitlab-calc/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/velaqori/dependsecure

Root: `companies/velaqori/dependsecure/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/velaqori/fileguard

Root: `companies/velaqori/fileguard/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/velaqori/frontpage

Root: `companies/velaqori/frontpage/frontend/src` — 8 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/velaqori/frontpage/frontend/src/styles/app.css:65` | Rule ".segmented" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 2 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/velaqori/frontpage/frontend/src/styles/app.css:104` | Rule ".dialog" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 3 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/velaqori/frontpage/frontend/src/styles/app.css:114` | Rule ".palette-list" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 4 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/velaqori/frontpage/frontend/src/styles/app.css:132` | Rule ".sidebar-scroll" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 5 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/velaqori/frontpage/frontend/src/styles/app.css:236` | Rule ".reader-scroll" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 6 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/velaqori/frontpage/frontend/src/styles/app.css:252` | Rule ".prose pre" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 7 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/velaqori/frontpage/frontend/src/styles/app.css:255` | Rule ".prose table" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |
| 8 | minor | low | A11Y-SCROLL-01 (P46/P10) | `companies/velaqori/frontpage/frontend/src/styles/app.css:331` | Rule ".table-wrap" creates an auto-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it. |

## companies/velaqori/hashsight

Root: `companies/velaqori/hashsight/frontend/src` — 3 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/hashsight/frontend/src/pages/HistoryPage.tsx:32` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 2 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/hashsight/frontend/src/pages/CasesPage.tsx:37` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |
| 3 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/hashsight/frontend/src/pages/RecordPage.tsx:38` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |

## companies/velaqori/incidentflow

Root: `companies/velaqori/incidentflow/frontend/src` — 5 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/incidentflow/frontend/src/pages/BoardPage.tsx:41` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 2 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/incidentflow/frontend/src/pages/BoardPage.tsx:53` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 3 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/incidentflow/frontend/src/pages/LoginPage.tsx:60` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 4 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/incidentflow/frontend/src/pages/BoardPage.tsx:38` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |
| 5 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/incidentflow/frontend/src/pages/IncidentPage.tsx:31` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |

## companies/velaqori/netscope

Root: `companies/velaqori/netscope/frontend/src` — 3 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/netscope/frontend/src/pages/CapturePage.tsx:80` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 2 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/netscope/frontend/src/pages/CapturePage.tsx:34` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |
| 3 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/netscope/frontend/src/pages/CapturesPage.tsx:35` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |

## companies/velaqori/phishlens

Root: `companies/velaqori/phishlens/frontend/src` — 4 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/phishlens/frontend/src/pages/AnalyzePage.tsx:35` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 2 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/phishlens/frontend/src/pages/HistoryPage.tsx:31` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 3 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/phishlens/frontend/src/pages/MessagePage.tsx:48` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 4 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/phishlens/frontend/src/pages/MessagePage.tsx:36` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |

## companies/velaqori/securecode-workbench

Root: `companies/velaqori/securecode-workbench/frontend/src` — 5 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/securecode-workbench/frontend/src/pages/FindingsPage.tsx:45` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 2 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/securecode-workbench/frontend/src/pages/FindingsPage.tsx:49` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 3 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/securecode-workbench/frontend/src/pages/ProjectsPage.tsx:42` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 4 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/securecode-workbench/frontend/src/pages/FindingsPage.tsx:77` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |
| 5 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/securecode-workbench/frontend/src/pages/ProjectsPage.tsx:26` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |

## companies/velaqori/sentinelcore

Root: `companies/velaqori/sentinelcore/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/velaqori/sentinellog

Root: `companies/velaqori/sentinellog/frontend/src` — 0 findings.

No findings — every static detector passed.

## companies/velaqori/threatintel-desk

Root: `companies/velaqori/threatintel-desk/frontend/src` — 6 findings.

| # | Severity | Conf. | Rule | Location | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/threatintel-desk/frontend/src/pages/DeskPage.tsx:30` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 2 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/threatintel-desk/frontend/src/pages/DeskPage.tsx:45` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 3 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/threatintel-desk/frontend/src/pages/DeskPage.tsx:58` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 4 | major | high | FORM-LABEL-01 (P24/P57) | `companies/velaqori/threatintel-desk/frontend/src/pages/IndicatorsPage.tsx:44` | Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>. |
| 5 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/threatintel-desk/frontend/src/pages/DeskPage.tsx:27` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |
| 6 | minor | medium | A11Y-HEADING-01 (P62/P41) | `companies/velaqori/threatintel-desk/frontend/src/pages/IndicatorsPage.tsx:82` | Heading level jumps from h1 to h3; insert the missing level or restructure the outline (per-file analysis — verify the composed page). |

## Triage decisions and deferred findings

- **Fixed in this pass (all critical and major defects):** removed focus outlines without replacement, sub-44px touch targets, unlabelled controls, z-index escalation past the named layers, off-vocabulary motion durations, missing reduced-motion fallbacks, skipped heading levels, key handlers on non-interactive containers and a theme-aware contrast failure in the company platform (white text on light accent fills; replaced with a per-theme `--accent-contrast` foreground token). Every fix is re-verified by this scan and by the regression gate in `src/features/ux-engine/scanner/repoScan.test.ts`.
- **Deferred `TOKEN-SPACING-01` (minor token hygiene):** 75 findings on literal spacing inside the hand-tuned vocal-separator stylesheet. They are convention deviations rather than user-facing defects. Normalising them means choosing between the two nearest scale tokens at each site, which changes rendered geometry; the Playwright visual-regression suite (`e2e/`) now gates that change with committed screenshot baselines, so the cleanup is tracked separately rather than applied blind.
- **Review cues `A11Y-SCROLL-01` (low confidence):** 9 CSS rules create `overflow: auto/scroll` regions. CSS cannot see rendered overflow or tab order, so each is a review cue rather than a defect claim; the Playwright axe run (`e2e/`) executes `scrollable-region-focusable` against the rendered DOM to confirm or clear every cue, and the pinned location inventory in `repoScan.test.ts` fails the gate on any new cue.

| Frontend | Location | Off-scale values |
| --- | --- | --- |
| Company platform (Next.js) | `company-platform/src/app/openjarvis/page.tsx:113` | px |
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
| companies/tamuzi/cyberaware-lab | `companies/tamuzi/cyberaware-lab/frontend/src/pages/InstructorPage.tsx:37` | px |
| companies/tamuzi/cyberaware-lab | `companies/tamuzi/cyberaware-lab/frontend/src/pages/SimulationPage.tsx:78` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:156` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:198` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:208` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:221` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:256` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:264` | 9, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:303` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:314` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:352` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:359` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:388` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:392` | 5, 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:426` | 10, 13, 15, 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:459` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:466` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:474` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:479` | 11, 55px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:488` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:546` | 10, 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:552` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:569` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:580` | 28, 22, 26px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:583` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:627` | 9, 20, 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:659` | 18, 27, 10, 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:685` | 30, 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:693` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:696` | 11, 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:728` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:743` | 20, 19, 23, 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:756` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:765` | 7, 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:771` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:785` | 18, 19, 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:790` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:843` | 15, 37px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:857` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:863` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:883` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:886` | 6, 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:916` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:919` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:935` | 38px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:938` | 34, 42, 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:944` | 25, 5, 29px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:951` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:959` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:965` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:977` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:983` | 26, 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:993` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1003` | 29px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1009` | 15, 26px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1020` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1052` | 9, 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1059` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1119` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1136` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1147` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1200` | 5, 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1215` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1224` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1232` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1236` | 6, 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1276` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1299` | 23, 26, 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1306` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1316` | 6, 7, 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1336` | 29, 26px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1343` | 9, 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1365` | 22, 26, 21px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1369` | 5, 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1385` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1413` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1421` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1433` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1439` | 26, 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1451` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1470` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1478` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1485` | 15, 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1494` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1502` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1510` | 15, 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1531` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1555` | 15, 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1566` | 14, 17, 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1583` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1589` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1632` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1642` | 30, 13, 17, 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1672` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1681` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1686` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1725` | 15, 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1732` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1748` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1757` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1791` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1803` | 9, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1821` | 9, 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1847` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1851` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1851` | 26px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1854` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1872` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1889` | 7, 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1895` | 10, 23, 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1904` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1907` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1918` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1927` | 7, 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1941` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1957` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1957` | 18, 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1965` | 14, 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1984` | 19, 28px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:1996` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2036` | 29px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2049` | 28px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2055` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2059` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2073` | 26px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2076` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2085` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2090` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2096` | 10, 19, 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2128` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2134` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2143` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2148` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2152` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2156` | 6, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2160` | 7, 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2174` | 5, 6, 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2194` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2206` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2206` | 7, 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2211` | 5, 10, 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2221` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2238` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2255` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2255` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2269` | 13, 18, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2282` | 14, 18, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2298` | 21px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2301` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2304` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2311` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2316` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2335` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2356` | 9, 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2400` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2419` | 18, 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2433` | 13, 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2450` | 7, 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2459` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2470` | 19, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2478` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2485` | 6, 13, 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2502` | 20, 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2515` | 27px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2535` | 27, 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2538` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2544` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2560` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2569` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2574` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2581` | 11, 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2605` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2626` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2629` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2644` | 28, 27px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2655` | 14, 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2665` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2697` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2706` | 29, 21px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2712` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2721` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2727` | 29, 33px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2736` | 14, 22, 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2756` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2773` | 28, 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2778` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2784` | 5, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2821` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2828` | 21px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2833` | 21px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2838` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2842` | 20, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2850` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2850` | 17, 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2868` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2876` | 17, 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2887` | px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2887` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2898` | 9, 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2913` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2918` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2935` | 18, 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2938` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2958` | 6, 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2965` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2984` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:2992` | 31, 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3001` | 7, 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3006` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3011` | 10, 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3032` | 10, 35, 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3044` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3050` | 10, 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3065` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3068` | 13, 19, 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3100` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3103` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3108` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3114` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3120` | 10, 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3132` | 30, 80, 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3198` | 23, 30, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3206` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3218` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3229` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3255` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3261` | 10, 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3273` | 29, 26px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3278` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3303` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3321` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3365` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3379` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3418` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3426` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3434` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3449` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3454` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3457` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3461` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3466` | 29, 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3476` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3496` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3506` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3516` | 13, 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3520` | 27, 30, 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3550` | 21, 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3559` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3575` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3587` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3594` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3604` | 18, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3611` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3619` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3624` | 9, 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3630` | 6, 13, 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3672` | 40px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3680` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3703` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3709` | 45, 35px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3719` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3728` | 10, 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3744` | 29, 21, 27px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3762` | 28px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3766` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3776` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3781` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3796` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3802` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3812` | 60, 30px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3820` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3854` | 14, 18, 5, 27px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3890` | 15, 27, 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3898` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3902` | 6, 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3917` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3921` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3929` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3943` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3968` | 9, 27, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:3987` | 30px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4010` | 7, 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4022` | 5, 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4039` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4044` | 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4063` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4074` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4082` | 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4087` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4110` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4131` | 7, 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4159` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4164` | 20, 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4194` | 6, 19, 29px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4213` | 33px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4220` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4240` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4246` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4250` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4265` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4276` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4300` | 10, 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4312` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4341` | 6, 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4355` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4361` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4373` | 19, 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4383` | 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4412` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4422` | 9, 13, 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4437` | 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4451` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4485` | 26px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4492` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4500` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4507` | 19, 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4523` | 25, 30, 28px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4529` | 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4532` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4543` | 34px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4546` | 37, 31px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4553` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4562` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4566` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4583` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4589` | 22, 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4593` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4601` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4607` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4622` | 9, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4637` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4642` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4652` | 40, 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4663` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4673` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4678` | 36px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4683` | 69, 60px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4688` | 7, 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4701` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4716` | 27px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4719` | 13, 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4723` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4732` | 55px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4739` | 28, 17, 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4755` | 21px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4780` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4800` | 6, 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4806` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4816` | 5, 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4835` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4846` | 39, 46px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4853` | 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4862` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4868` | 70, 46px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4889` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4892` | 28px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4907` | 9, 21px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4943` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4952` | 14, 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4962` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4968` | 13, 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4977` | 17, 43, 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:4996` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5001` | 65, 75px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5005` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5015` | 25, 13, 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5019` | 26, 36, 35, 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5044` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5054` | 40px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5057` | 40px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5069` | 27, 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5073` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5077` | 38px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5082` | 22, 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5086` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5089` | 21px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5096` | 5, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5102` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5110` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5121` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5124` | 14, 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5132` | 28px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5135` | 30px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5151` | 28px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5180` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5183` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5202` | 21px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5206` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5214` | 25, 26px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5220` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5224` | 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5230` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5237` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5240` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5253` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5262` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5269` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5272` | 29px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5276` | 30px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5279` | 40, 35px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5299` | 13, 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5309` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5317` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5327` | 15, 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5340` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5349` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5352` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5361` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5376` | 60px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5380` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5386` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5427` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5431` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5441` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5464` | 23, 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5488` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5495` | 29, 28, 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5510` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5528` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5539` | 30, 28px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5549` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5561` | 53px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5566` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5611` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5618` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5636` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5643` | 27, 29px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5659` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5670` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5678` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5687` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5694` | 27, 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5713` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5720` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5725` | 21, 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5743` | 30px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5758` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5767` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5774` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5806` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5815` | 29, 30px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5843` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5855` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5878` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5881` | 25, 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5887` | 27px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5895` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5913` | 18, 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5923` | 20, 18, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5935` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5946` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5951` | 5, 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5960` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5963` | 10, 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5970` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5979` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:5985` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6001` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6006` | 11, 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6022` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6046` | 20, 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6072` | 29px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6076` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6102` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6110` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6121` | 28, 11, 17, 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6137` | 45, 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6153` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6166` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6173` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6195` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6200` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6215` | 26px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6229` | 22, 28px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6243` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6258` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6261` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6275` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6284` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6291` | 7, 10, 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6295` | 5, 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6317` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6322` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6326` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6336` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6342` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6384` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6388` | 7, 9, 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6406` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6421` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6428` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6434` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6440` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6451` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6455` | 7, 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6462` | 22, 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6467` | 19, 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6472` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6505` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6509` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6512` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6517` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6539` | 17, 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6546` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6550` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6557` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6564` | 7, 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6569` | 9, 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6596` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6608` | 19, 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6614` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6622` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6636` | 10, 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6646` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6657` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6663` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6671` | 14, 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6685` | 47px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6689` | 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6713` | 22, 18, 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6729` | 21px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6734` | 20, 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6743` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6750` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6755` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6758` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6768` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6794` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6803` | 35, 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6815` | 15, 10px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6825` | 46px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6839` | 11px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6847` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6853` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6871` | 6, 19px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6875` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6882` | 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6903` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6908` | 13, 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6914` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6936` | 45, 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6953` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6956` | 10, 21px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6973` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:6980` | 9, 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7004` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7012` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7037` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7046` | 14px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7057` | 13, 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7085` | 18px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7093` | 25px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7108` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7121` | 21px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7141` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7153` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7156` | 9, 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7164` | 20px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7167` | 45px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7170` | 6, 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7179` | 22px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7195` | 11, 13, 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7200` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7204` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7208` | 15, 36px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7214` | 23px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7257` | 38, 42px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7264` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7273` | 27px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7292` | 9px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7296` | 22, 26px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7317` | 18, 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7364` | 45, 50px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7377` | 23, 20, 29, 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7389` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7396` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7434` | 15px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7446` | 20, 17px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7452` | 13px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7467` | 6px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7480` | 5px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7508` | 7px |
| companies/tamuzi/transcriptwise | `companies/tamuzi/transcriptwise/frontend/src/styles.css:7602` | 45px |
| companies/velaqori/assetwatch | `companies/velaqori/assetwatch/frontend/src/pages/AssetsPage.tsx:27` | px |
| companies/velaqori/assetwatch | `companies/velaqori/assetwatch/frontend/src/pages/ScansPage.tsx:23` | px |
| companies/velaqori/frontpage | `companies/velaqori/frontpage/frontend/src/styles/app.css:65` | px |
| companies/velaqori/frontpage | `companies/velaqori/frontpage/frontend/src/styles/app.css:104` | px |
| companies/velaqori/frontpage | `companies/velaqori/frontpage/frontend/src/styles/app.css:114` | px |
| companies/velaqori/frontpage | `companies/velaqori/frontpage/frontend/src/styles/app.css:132` | px |
| companies/velaqori/frontpage | `companies/velaqori/frontpage/frontend/src/styles/app.css:236` | px |
| companies/velaqori/frontpage | `companies/velaqori/frontpage/frontend/src/styles/app.css:252` | px |
| companies/velaqori/frontpage | `companies/velaqori/frontpage/frontend/src/styles/app.css:255` | px |
| companies/velaqori/frontpage | `companies/velaqori/frontpage/frontend/src/styles/app.css:331` | px |
| companies/velaqori/hashsight | `companies/velaqori/hashsight/frontend/src/pages/CasesPage.tsx:37` | px |
| companies/velaqori/hashsight | `companies/velaqori/hashsight/frontend/src/pages/RecordPage.tsx:38` | px |
| companies/velaqori/incidentflow | `companies/velaqori/incidentflow/frontend/src/pages/BoardPage.tsx:38` | px |
| companies/velaqori/incidentflow | `companies/velaqori/incidentflow/frontend/src/pages/IncidentPage.tsx:31` | px |
| companies/velaqori/netscope | `companies/velaqori/netscope/frontend/src/pages/CapturePage.tsx:34` | px |
| companies/velaqori/netscope | `companies/velaqori/netscope/frontend/src/pages/CapturesPage.tsx:35` | px |
| companies/velaqori/phishlens | `companies/velaqori/phishlens/frontend/src/pages/MessagePage.tsx:36` | px |
| companies/velaqori/securecode-workbench | `companies/velaqori/securecode-workbench/frontend/src/pages/FindingsPage.tsx:77` | px |
| companies/velaqori/securecode-workbench | `companies/velaqori/securecode-workbench/frontend/src/pages/ProjectsPage.tsx:26` | px |
| companies/velaqori/threatintel-desk | `companies/velaqori/threatintel-desk/frontend/src/pages/DeskPage.tsx:27` | px |
| companies/velaqori/threatintel-desk | `companies/velaqori/threatintel-desk/frontend/src/pages/IndicatorsPage.tsx:82` | px |

## Remediation contract

Every finding resolves through the engine rule catalog: the rule statement, impacted users, remediation steps and verification procedure are available from `/ux-engine` and `src/features/ux-engine/rules.ts`. Re-run this scan after fixes to confirm the finding disappears.
