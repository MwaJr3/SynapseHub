# Personal Operating System

The `/system` route is a **local-first, browser-based 12-week personal operating system**. It is deliberately an execution workspace rather than a general-purpose life tracker: every record should clarify a decision, reduce friction, support recovery, or produce a visible next action.

It is a reflective productivity tool. Personality frameworks, energy ratings, and blocker maps are user-selected lenses; they are not diagnoses, clinical assessments, or claims that the application can infer hidden motives.

## Start here

A first-run workspace is empty by design. The dashboard will say **No active plan** instead of inserting invented goals, projects, relationships, or reflections.

1. Open **Direction** and write a short vision, identity focus, and first cycle name.
2. Add one Tier 1 foundation goal and, when ready, one Tier 2 project goal.
3. Open **Plan & execute**, declare weekly available, fixed-commitment, and recovery hours, then add a small number of visible actions.
4. Use **Review** to record energy, a weekly adjustment, blocker occurrences, and a meaning bridge.
5. Use **Growth** only when a learning path, relationship follow-up, principle, or financial entry will change a real decision.

## Current functionality

### Dashboard and authoritative signal

The dashboard asks what deserves attention now. It shows:

- an explainable, single authoritative signal: **No active plan**, **Stable**, **Attention needed**, or **Intervention needed**;
- transparent status cards for energy, direction, weekly capacity, project focus, blockers, decisions, purpose, and review completion;
- today’s scheduled actions, unresolved decisions, and the most recent meaning anchor.

The signal and health cards are computed in `src/features/personal-os/system.ts`, not independently in interface components.

### Direction, goals, projects, and quality standards

- Vision, mission, identity statement, core values, desired traits, non-negotiables, and patterns to stop repeating
- Minimum / standard / exceptional definitions of done
- Cycle name, theme, current week, and end date
- Goals with a domain, Tier 1–3 priority, intended outcome, evidence, baseline, target, measurement method, deadline, and definition of done
- CORE, SUPPORT, EXPERIMENT, and PARKED project states with MVP, audience, next milestone, stop condition, and shipped status

### Weekly planning and daily execution

The weekly plan explicitly separates available time, fixed commitments, and recovery. The system totals action estimates and warns when planned work exceeds the remaining flexible capacity.

Actions support a date, linked goal, tier, estimate, cognitive demand, first physical next action, and planned/complete/skipped state. The dashboard only promotes actions actually scheduled for today.

### Decisions, blockers, energy, and review

- A Type A/B/C decision register records realistic options, deadline, opportunity cost, strongest counterargument, confidence, expected outcome, and later review fields.
- Energy check-ins record sleep quality, physical and cognitive energy, emotional load, recovery, stress, constraint, priority, and an optional contextual note.
- A three-minute **Se Activation Timer** uses the browser event loop and asks for a physical action before it starts; it does not block the interface.
- Users can build a trigger → warning → behaviour → consequence → intervention → recovery response map, then log individual blocker occurrences and outcomes.
- Weekly reviews record progress, friction, adjustment, a meaning anchor, relationship action, and a calibration question.
- Meaning entries persist the connection between a concrete action, value, goal, and long-term vision.
- Post-mortems convert an intended/actual outcome into a proposed system change rather than a self-judgment.

### Growth modules

These are intentionally lightweight, not separate external applications:

- **Learning paths:** current capability, target capability, next applied action, and evidence.
- **Relationships:** optional display name, category, context, next contact, mutual value, and private note. Relationship quality is not scored.
- **Personal doctrine:** concise principle, practical implication, limitation, and related value.
- **Finance:** a manual income/expense/saving ledger with per-entry currency. It does not connect to bank accounts or treat projected income as earnings.

### Cycle completion and history

In week 12, the Review workspace enables a guided retrospective. Completing it creates an independent archive containing the cycle’s goals, projects, actions, reviews, meaning entries, blocker logs, and energy records, then starts a fresh 12-week clock. Archived snapshots cannot be changed by later edits to current records.

The global **New 90-day clock** button also archives a snapshot after confirmation, but the guided week-12 flow is preferred because it records retrospective evidence.

## Data safety and privacy

- Data stays in this browser’s `localStorage`; no account, API, analytics service, or network request is used by the Personal OS.
- The current persisted schema is **version 2**. Existing version-1 workspaces are migrated in memory on first load, retaining previous fields and adding explicit defaults for new fields.
- Invalid or malformed stored payloads are **not silently overwritten**. The original raw value is copied to a timestamped recovery key when storage permits, and the interface enters recovery mode with a **Download preserved payload** option until the user explicitly imports or resets.
- **Export JSON** produces a complete versioned workspace export. **Import / restore** validates the top-level format and also accepts a version-1 export for migration.
- Export before clearing browser data, changing browsers/devices, or choosing reset. Browser-local storage is not a substitute for a backup.
- Private reflections, relationship notes, and finance entries are included in the complete export. Only share an export knowingly.

## Verification

The Personal OS includes unit tests for cycle calculations, energy calculation, health and overall signals, weekly capacity overload detection, v1 → v2 migration, and immutable archive snapshots. It also includes a routed UI workflow test for the empty initial state and weekly capacity persistence. Accessibility structural tests cover `/system` alongside the site’s other routes.

Run all repository checks with:

```bash
npm install
npm run check
```

## Deliberate limitations and next priorities

Implemented does **not** mean complete. The current application is a client-only module inside an existing portfolio site, so it does not provide a Python/Tkinter application, a repository-per-entity persistence layer, OS-level file locking, desktop notifications, encrypted storage, cloud sync, or server-side backups.

The next valuable increments are:

1. Edit forms for every persisted record and richer project shipping evidence.
2. Monthly trend views that show observations with sample-size limitations, not causal claims.
3. A dedicated skill-to-income experiment record and collaboration protocol.
4. A reviewed backup/import flow with scoped exports and a visible recovery browser.
5. More UI workflow tests for cycle completion, blocker outcomes, and import recovery.

The governing principle remains:

> The system should connect action to purpose, make trade-offs explicit, surface recurring friction, and create the next useful adjustment — not become another project to optimise indefinitely.
