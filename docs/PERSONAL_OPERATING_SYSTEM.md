# Personal Operating System

The `/system` route is a **local-first, browser-based 12-week personal operating system**. It is deliberately an execution workspace rather than a general-purpose life tracker: every record should clarify a decision, reduce friction, support recovery, or produce a visible next action.

It is a reflective productivity tool. Personality frameworks, energy ratings, and blocker maps are user-selected lenses; they are not diagnoses, clinical assessments, or claims that the application can infer hidden motives.

## Start here

A first-run workspace is empty by design. The dashboard will say **No active plan** instead of inserting invented goals, projects, relationships, or reflections.

1. Open **Direction** and write a short vision, identity focus, and first cycle name.
2. Add one Tier 1 foundation goal and, when ready, one Tier 2 project goal.
3. Open **Plan & execute**, declare weekly available, fixed-commitment, and recovery hours, then add a small number of visible actions.
4. Use **Review** to record energy, a weekly adjustment, blocker occurrences, and a meaning bridge.
5. Use **Schedule** to reserve a realistic time block when an action needs a boundary, then export an ICS file only if you choose to import it into another calendar.
6. Use **Review** and **Analytics** to observe recorded patterns; use **Records** when a complete edit or restoration is needed.
7. Use **Growth** only when a learning path, relationship follow-up, principle, or financial entry will change a real decision.

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

### Time blocks and calendar exchange

**Schedule** is a full local time-block scheduler: reserve dated start/end blocks, associate them with a domain or action, record a location or note, and remove them when the plan changes. It exports a standards-compatible `.ics` calendar file.

The file is an exchange artifact, not calendar sync. The app does not sign into Google Calendar, Outlook, or another provider, read external calendars, or resolve scheduling conflicts.

### Analytics and evidence

**Analytics** provides graphical monthly and quarterly views for completed actions, planned action hours, recorded energy, blockers, and reviews. Every chart has an inspection table and explicitly distinguishes an observation window from a causal conclusion. Missing data is not converted into a negative score or a prediction.

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

### Complete editing and local history

The **Records** workspace exposes every persisted record collection, including schedules and cycle archives, for an advanced JSON-object edit, creation, or removal. Guided forms remain the quicker way to add common records. Each normal record mutation creates a bounded local history event with a prior value when one exists. Select **Restore prior version** to deliberately replace the current record with that earlier value. The newest 300 history events are retained locally; this is recovery support, not an immutable compliance log.

## Data safety and privacy

- Data stays in this browser’s `localStorage`; no account, API, analytics service, or network request is used by the Personal OS.
- The current persisted schema is **version 3**. Version-1 workspaces are migrated to v2, then v3; version-2 workspaces receive explicit empty schedule and history collections. Existing record data is retained during those deterministic migrations.
- Invalid or malformed stored payloads are **not silently overwritten**. The original raw value is copied to a timestamped recovery key when storage permits, and the interface enters recovery mode with a **Download preserved payload** option until the user explicitly imports or resets.
- **Full backup** produces the only complete, restorable versioned workspace export. **Restore backup** validates the top-level format and also accepts v1 and v2 exports for migration.
- Scoped copies can contain the current cycle, planning-only, or review-only view. The optional redaction removes selected narrative/private-text fields. Scoped files are deliberately not restorable because partial data must not silently replace a complete workspace.
- **Encrypted copy** encrypts a selected export in the browser with AES-GCM and a passphrase-derived PBKDF2-SHA-256 key. The passphrase is never stored and cannot be recovered. Only an encrypted *full* backup can restore a workspace. Encryption protects the downloaded archive, not the active browser `localStorage` workspace.
- In browsers that support Web Locks, saves are serialized among open tabs of this app. This is cooperative browser coordination, not operating-system locking, cloud synchronization, multi-device merging, or a conflict-resolution service.
- Export before clearing browser data, changing browsers/devices, or choosing reset. Manual transfer of a full backup or encrypted full backup is the available multi-device path; browser-local storage is not a substitute for a backup.
- Private reflections, relationship notes, and finance entries are included in a full export. Only share an export knowingly.

## Verification

The Personal OS includes unit tests for cycle calculations, energy calculation, health and overall signals, weekly capacity overload detection, v1 → v2 → v3 migration, scoped/redacted exports, encrypted-export round trips and incorrect-passphrase rejection, ICS generation, monthly/quarterly evidence aggregation, and immutable archive snapshots. Routed UI workflow tests cover the empty initial state, weekly-capacity persistence, local time-block persistence, and the week-12 cycle-completion archive flow. Accessibility structural tests cover `/system` alongside the site’s other routes.

Run all repository checks with:

```bash
npm install
npm run check
```

## Deliberate limitations and next priorities

Implemented does **not** mean complete. The React application remains a client-only module inside an existing portfolio site: it has no server-side backups, account system, provider OAuth, cloud synchronization, conflict resolver, live bank connection, financial advice engine, tax calculation, or defensible revenue-prediction model. Currency totals intentionally stay separated rather than being converted or summed.

An optional, standalone Python/Tkinter reviewer lives in [`tools/personal_os_companion`](../tools/personal_os_companion/). It has no network code and can inspect a backup shape or normalize a user-selected manual CSV for review. It cannot access browser storage, sync data, connect to a bank, or restore an app workspace. Its deterministic pytest suite and optional Hypothesis property test are documented in that folder.

The next valuable increments are:

1. Purpose-built visual edit forms for the less-frequent records, while preserving the current complete advanced editor.
2. More UI workflow tests for blocker outcomes, history restoration, encrypted restore, and import recovery.
3. An authenticated server only if a clear consent, conflict-resolution, key-management, and deletion model is designed first.
4. A dedicated skill-to-income experiment record and collaboration protocol based on user-entered evidence rather than forecasts.

The governing principle remains:

> The system should connect action to purpose, make trade-offs explicit, surface recurring friction, and create the next useful adjustment — not become another project to optimise indefinitely.
