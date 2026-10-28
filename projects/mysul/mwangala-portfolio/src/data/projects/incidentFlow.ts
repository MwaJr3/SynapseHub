import type { Project } from '@/types/project';
import { projectLinks } from '@/config/projectLinks';

const links = projectLinks('incidentflow');

export const incidentFlow: Project = {
  id: 'prj-incidentflow',
  slug: 'incidentflow',
  name: 'IncidentFlow',
  tagline: 'From first alert to documented resolution.',
  summary:
    'A security incident management workspace that carries an incident through investigation, containment, recovery and closure with a complete, auditable timeline.',
  description: [
    'IncidentFlow organises security incidents from initial reporting through investigation, response, resolution and retrospective review. Incidents, response tasks, timeline events, affected assets, indicator associations, analyst notes and evidence references live in one structured workspace.',
    'The core of the application is a lifecycle: New → Investigating → Contained → Recovering → Resolved → Closed. Transitions are validated server-side, recorded with actor and timestamp, and cannot be skipped or rewritten after the fact.',
    'It is a workflow tool rather than a dashboard. The value is in the discipline it enforces — who owns this incident, what has been done, what is outstanding, and what did we learn — and in a report that can be produced without anyone reconstructing events from memory.',
  ],
  categories: ['Security Operations', 'Full-Stack Engineering'],
  filters: ['cybersecurity', 'security-operations', 'full-stack'],
  tech: [
    'Python',
    'FastAPI',
    'Pydantic',
    'SQLAlchemy',
    'Alembic',
    'PostgreSQL',
    'Passlib/bcrypt auth',
    'JWT sessions',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'React Query-style server state',
    'pytest',
  ],
  keyTech: ['Python', 'FastAPI', 'SQLAlchemy', 'React', 'PostgreSQL'],
  featured: true,
  order: 4,
  status: 'Built — lifecycle, RBAC, audit trail and reporting complete and tested as a Python CLI in apps/incidentflow-cli, and delivered as the full-stack application described in this case study at projects/incidentflow (FastAPI + PostgreSQL-ready backend with Alembic migrations, React frontend, backend and frontend tests)',
  year: '2025',
  role: 'Data modelling, workflow rules, permissions, frontend',
  accent: 'amber',
  capabilities: [
    'Server-enforced incident lifecycle with an immutable audit trail',
    'Role-based access control across analyst, responder and administrator roles',
  ],
  features: [
    {
      title: 'Incident creation with context',
      body: 'Title, description, category, severity, detection source, affected assets, reported time and reporter. Creation from a template pre-fills the category-specific task list so a suspicious-email case starts with the right first steps.',
    },
    {
      title: 'Validated lifecycle transitions',
      body: 'The state machine defines which transitions are legal and what each requires — for example Resolved requires at least one recorded finding and no open critical tasks. Illegal transitions are rejected with the reason, not silently accepted.',
    },
    {
      title: 'Chronological timeline',
      body: 'Status changes, observations, response actions, task completions, notes and association changes all append to one ordered timeline with actor and timestamp. The timeline is the incident record; it is append-only.',
    },
    {
      title: 'Response task management',
      body: 'Tasks with owner, priority, due state and completion evidence, generated from templates or added ad hoc. Outstanding tasks are visible on the incident and on the assignee\'s queue.',
    },
    {
      title: 'Associations',
      body: 'Link an incident to assets, threat indicators, originating alerts, evidence references and related cases. Associations are metadata references — the application does not ingest or store sensitive evidence files.',
    },
    {
      title: 'Findings, hypotheses and recommendations',
      body: 'Analysts record investigation hypotheses, confirmed findings with supporting references, and remediation recommendations, each attributed and timestamped.',
    },
    {
      title: 'Templates for common scenarios',
      body: 'Suspicious email, malware alert, compromised account and unusual network activity ship with category-appropriate initial tasks, severity guidance and report sections. Templates are administrator-editable.',
    },
    {
      title: 'Dashboard and reporting',
      body: 'Volume by period, severity distribution, status breakdown, assignment load and time-to-containment / time-to-resolution statistics. A structured incident report exports the timeline, findings, actions taken, outstanding risks and lessons learned.',
    },
    {
      title: 'Audit trail',
      body: 'Security-sensitive actions — status change, assignment, severity change, permission change, deletion attempts — are recorded separately from the narrative timeline so administrative history stays readable.',
    },
  ],
  demonstrates: [
    'Complex CRUD workflows with real business rules',
    'Relational database design across seven related entities',
    'Authentication and role-based authorisation',
    'State-machine modelling enforced on the backend',
    'Append-only audit logging',
    'Report generation from structured records',
  ],
  caseStudyFocus:
    'How incidents, tasks, assets, timeline events and notes relate to one another — the lifecycle design, backend-enforced permissions, transition rules and audit records.',
  visualDirection:
    'Professional operations interface: incident overview, severity distribution, assignment information, searchable case table, chronological timelines. Restrained status indicators, clearly differentiated workflow states.',
  preview: {
    visual: 'incidentflow',
    alt: 'Representative IncidentFlow preview: an incident summary header with severity and status, a response-task list and a chronological timeline.',
    screenshotNote:
      'Hand-drawn representative preview built from the implemented feature set, not a screenshot of a deployed instance. Set preview.screenshot to replace it.',
  },
  liveUrl: links.live,
  repoUrl: links.repo,
  needsAuthorReview: [
    'challenges — confirm the wording matches your own implementation history',
    'testing — replace described coverage with your verified results',
  ],
  caseStudy: {
    problem: [
      'Incident response generates more coordination overhead than technical work. During an active case, information is spread across chat threads, spreadsheets, email and someone\'s memory — and the person who knows what happened at 02:10 is the person who is asleep.',
      'Afterwards the problem compounds. Writing a report means reconstructing a sequence of events from fragments, which is slow, unreliable and usually done under time pressure from management rather than from curiosity.',
      'Generic task managers do not fit: they have no notion of severity, containment, evidence references, or a timeline that must not be editable after the fact.',
    ],
    whoBenefits: [
      'Security operations teams needing a shared, auditable case record',
      'IT administrators handling incidents alongside their normal duties',
      'Incident responders who must produce a defensible post-incident report',
      'Students and small organisations building their first incident-management process',
    ],
    objectives: [
      'One authoritative record per incident that survives staff changes and shift handovers.',
      'Workflow rules enforced on the server, so the record cannot drift into an inconsistent state.',
      'Report generation from structured data, not from retyping a timeline.',
      'Permissions that protect investigation notes and evidence metadata.',
      'Fast triage: a responder should be able to see status, owner, severity and outstanding tasks without opening every incident.',
    ],
    solution: [
      'The data model is the design. Seven entities carry the domain: Incident, IncidentEvent (timeline), ResponseTask, Finding, Association, Note and AuditRecord, with Asset and User referenced by association.',
      'IncidentEvent is append-only and typed — status_change, observation, action, association, note_added, task_update — so the timeline can be rendered, filtered and exported without parsing free text. Nothing updates or deletes an event; corrections are new events that reference the old one.',
      'The lifecycle is an explicit state machine module. It declares legal transitions and the precondition each one requires, and the API layer asks it for permission before writing. Because the rules live in one pure-Python module they are exhaustively unit-tested and cannot be bypassed by a crafted request.',
      'Authorisation is role-based and checked in dependencies, not in handlers: administrator, responder, analyst and read-only. Every sensitive route resolves the incident, checks the caller\'s role against the required permission, and writes an audit record. Ownership is enforced by query scope so an identifier in a URL cannot reach another team\'s case.',
    ],
    workflow: {
      title: 'Incident lifecycle',
      steps: [
        { label: 'New', detail: 'Reported, categorised, severity assigned' },
        { label: 'Investigating', detail: 'Owner assigned, hypotheses and observations recorded' },
        { label: 'Contained', detail: 'Spread stopped, containment actions evidenced' },
        { label: 'Recovering', detail: 'Restoration tasks, verification of normal operation' },
        { label: 'Resolved', detail: 'Findings recorded, no open critical tasks' },
        { label: 'Closed', detail: 'Report generated, lessons learned captured' },
      ],
      caption:
        'Each transition has server-side preconditions and writes both a timeline event and an audit record.',
    },
    architecture: {
      summary:
        'FastAPI backend with a state-machine module, RBAC dependencies and an append-only event store; React frontend for triage, case detail and reporting.',
      layers: [
        {
          layer: 'Domain rules (pure Python)',
          items: [
            'Lifecycle state machine with transition preconditions',
            'Severity and category taxonomy',
            'Report assembly from structured records',
            'No framework imports — fully unit-testable in isolation',
          ],
        },
        {
          layer: 'API (FastAPI, Pydantic)',
          items: [
            'Typed request/response models per entity',
            'RBAC dependencies applied per route',
            'Incident CRUD, task CRUD, event listing, associations, notes, reports',
            'Search and filtering with validated query parameters',
          ],
        },
        {
          layer: 'Persistence (SQLAlchemy, Alembic, PostgreSQL)',
          items: [
            'Incidents, events, tasks, findings, associations, notes, audit records',
            'Foreign keys with restrictive delete semantics; events are append-only',
            'Indexes on status, severity, assignee and reported time',
          ],
        },
        {
          layer: 'Frontend (React, TypeScript)',
          items: [
            'Operations dashboard with volume, severity and assignment summaries',
            'Searchable incident table with filter and sort state in the URL',
            'Case detail: summary, tasks, timeline, findings, associations, notes',
            'Report view and export; permission-aware controls',
          ],
        },
      ],
      security: [
        'Passwords are hashed with an established algorithm via a maintained library — no custom password handling.',
        'Sessions use signed, expiring tokens with server-side revocation on logout and permission change.',
        'Authorisation checks run in route dependencies, so a missing check is visible in review rather than hidden in a handler.',
        'Evidence is referenced by metadata; the application does not store sensitive evidence files.',
        'All destructive and permission-sensitive actions are audited with actor, timestamp and before/after values.',
      ],
    },
    decisions: [
      {
        title: 'Append-only, typed timeline events',
        context:
          'The simplest design lets users edit incidents and notes freely, with an updated_at timestamp as the only history.',
        decision:
          'Every meaningful change appends a typed IncidentEvent. Records are never mutated in place; corrections are new events that reference the earlier one.',
        tradeoff:
          'More rows and a slightly more awkward "edit a note" flow (you add a correction rather than silently rewriting). In exchange the incident record is defensible: a report reflects what was known and when, which is the entire point of incident documentation.',
      },
      {
        title: 'Workflow rules in a framework-free module',
        context:
          'Transition checks written inside route handlers are untestable without a database and are easy to forget on a new endpoint.',
        decision:
          'A pure-Python state machine declares states, legal transitions and preconditions. Handlers call `transition(incident, requested_state, context)` and receive either a result or a typed rejection reason.',
        tradeoff:
          'An extra abstraction layer for what looks like an if-statement. It makes the full transition matrix testable in a few dozen assertions and guarantees that no endpoint can move an incident into an illegal state.',
      },
      {
        title: 'RBAC in dependencies, ownership in query scope',
        context:
          'Checking permissions inside each handler leads to routes where the check was forgotten, and object-identifier guessing is the classic way one team reads another team\'s case.',
        decision:
          'Role requirements are declared as FastAPI dependencies on each route. Incident resolution goes through a helper that filters by the caller\'s accessible scope, so a 404 is returned for an incident the caller may not see rather than a 403 that confirms it exists.',
        tradeoff:
          'Slightly less flexible for one-off exceptions, and 404-instead-of-403 makes debugging permission issues harder for administrators (mitigated with an administrator-visible access log). It removes an entire class of authorisation bug.',
      },
    ],
    testing: {
      summary:
        'Testing concentrates on lifecycle legality, permission enforcement and report correctness — the behaviours whose failure would be invisible in a demo. Verified current suite: 9 backend tests (pytest) and 2 frontend tests (vitest) pass.',
      items: [
        {
          title: 'State machine tests',
          body: 'The complete transition matrix: every legal transition succeeds, every illegal one is rejected with the documented reason, and each precondition (for example Resolved with an open critical task) is asserted in both directions.',
        },
        {
          title: 'Authorisation tests',
          body: 'Each role against each sensitive route, including cross-tenant identifier access, token expiry and permission change mid-session.',
        },
        {
          title: 'Audit tests',
          body: 'Every audited action produces exactly one audit record with correct actor and before/after values, and no audited action can complete without it.',
        },
        {
          title: 'Report tests',
          body: 'A seeded incident produces a report whose timeline order, finding set, task summary and outstanding-risk list match the underlying records exactly.',
        },
        {
          title: 'API integration tests',
          body: 'Full create → assign → transition → task complete → resolve → close → export flows against a test database, plus validation and error-envelope tests.',
        },
      ],
    },
    challenges: [
      {
        problem:
          'Concurrent responders. Two analysts update the same incident at once; one moves it to Contained while the other is still recording observations that assume Investigating.',
        approach:
          'Transitions are guarded by an optimistic concurrency check on the incident version, and a rejected transition returns the current state so the client can refresh and retry. Timeline appends are never blocked.',
        reasoning:
          'Pessimistic locking would make collaboration worse for the common case (two people adding notes). Optimistic versioning fails loudly only where it matters — a state change.',
        lesson:
          'Choose the locking strategy per operation, not per entity. Reads and appends should stay cheap; only the state change needs protection.',
      },
      {
        problem:
          'Templates that are too rigid get ignored; templates that are too loose provide no value.',
        approach:
          'Templates seed an initial task list and category metadata, but every seeded task can be dismissed with a reason recorded on the timeline. Templates themselves are administrator-editable and versioned.',
        reasoning:
          'A template is a starting hypothesis about what this kind of incident needs. Recording the dismissal preserves the reasoning when someone later asks why a standard step was skipped.',
        lesson:
          'Make guidance cheap to deviate from and expensive to deviate from silently.',
      },
      {
        problem:
          'Time-based statistics (time to contain, time to resolve) are easy to compute wrongly and easy to misread.',
        approach:
          'Metrics are derived from timeline events rather than from mutable timestamp columns, and the dashboard shows the population behind each figure with incidents excluded for missing transitions listed explicitly.',
        reasoning:
          'An average computed over a silently filtered subset misinforms management decisions. Showing the denominator keeps the number honest.',
        lesson:
          'Derive metrics from the immutable record, and always expose the sample size next to the average.',
      },
    ],
    demonstration: {
      summary:
        'A seeded demonstration dataset provides realistic incidents across the lifecycle so the workflow can be exercised without live cases.',
      steps: [
        {
          title: 'Create an incident from a template',
          body: 'Choose suspicious email, malware alert, compromised account or unusual network activity. Severity guidance and initial tasks are pre-filled and editable.',
        },
        {
          title: 'Work the case',
          body: 'Assign an owner, record observations and hypotheses, associate assets and indicators, and complete response tasks with evidence of completion.',
        },
        {
          title: 'Move through the lifecycle',
          body: 'Transition to Contained, then Recovering, then Resolved. Each transition checks its preconditions and appends a timeline and audit record.',
        },
        {
          title: 'Close and report',
          body: 'Capture lessons learned, generate the structured report, and export it. The report is assembled from the same records the dashboard reads.',
        },
      ],
      accessNote:
        'Demonstration incidents are labelled as sample data. No demo credentials are published on this page; a hosted instance would document its access method here.',
    },
    limitations: [
      'Not a SIEM. IncidentFlow does not ingest or correlate alert telemetry; alerts are referenced as associations, not collected.',
      'No automated response actions. Containment steps are recorded by people, not executed by the application.',
      'Evidence handling is metadata-only by design; binary evidence must live in a system built for chain of custody.',
      'Metrics assume timestamps are entered accurately. An incident transitioned retrospectively will produce misleading duration figures, which is disclosed in the report.',
      'Role model is fixed to four roles; finer-grained per-incident permissions are not implemented.',
      'Notifications and shift-handover digests are not implemented — the dashboard is pull-based.',
    ],
  },
};
