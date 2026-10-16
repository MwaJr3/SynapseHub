import type { ApproachStage } from '@/types';

/**
 * The five-stage engineering method used to organise the portfolio.
 *
 * Presented as the framework the projects follow, not as a claim that each
 * project was built in exactly this sequence on a documented timeline.
 */
export const approachStages: ApproachStage[] = [
  {
    id: 'understand',
    title: 'Understand',
    summary:
      'Start from the person and the constraint: who is learning, what connection and device they have, what the teacher needs to know, and which failure would cost them something they cannot replace.',
    practices: [
      'Identify intended users and the workflow they already follow',
      'Write down the constraints: bandwidth, device, language, cost, time, data sensitivity',
      'Name the failure modes worth designing for — dropped sync, missing provider, thin evidence',
      'Decide what the product must never claim, such as offline availability it cannot guarantee',
    ],
    artefacts: [
      'Problem statement and intended users per project',
      'Constraint list covering connectivity, device, cost and privacy',
      'Explicit non-goals for the first implementation',
    ],
  },
  {
    id: 'design',
    title: 'Design',
    summary:
      'Choose the architecture, data model and interface patterns that make the hard states ordinary: offline, partial, unavailable, unknown and unreviewed.',
    practices: [
      'Model the domain first: courses, skills, seats, sessions, consent, evidence and events',
      'Place provider boundaries — AI, real-time, messaging, payments — behind adapters',
      'Design the failure states before the happy path: sync conflicts, provider outages, rejected imports',
      'Define permissions and ownership rules at the API boundary, not in the interface',
    ],
    artefacts: [
      'Architecture overview per project, stored as structured data',
      'Typed data model and validation rules',
      'State machines for learners, sessions, applications and review workflows',
    ],
  },
  {
    id: 'build',
    title: 'Build',
    summary:
      'Implement the primary workflow end to end with typed boundaries, validated input and integrations isolated where they can be replaced without touching product logic.',
    practices: [
      'Keep API routes, schemas, domain logic, persistence and UI in separate modules',
      'Validate every input on the client for feedback and on the server for correctness',
      'Make writes idempotent where retries are expected: sync batches, callbacks, imports',
      'Keep secrets server-side and deliver files through short-lived signed links',
    ],
    artefacts: [
      'Working primary workflow with loading, empty, error and permission states',
      'Documented API surface and validation rules',
      'Seeded synthetic demonstration data that contains no real personal information',
    ],
  },
  {
    id: 'test',
    title: 'Test',
    summary:
      'Verify the behaviours that carry risk: permissions, scoring, state transitions, offline recovery, provider failure, data quality and report accuracy.',
    practices: [
      'Unit-test business rules: grading, mastery estimation, eligibility and allocation constraints',
      'Integration-test backend workflows, including rejected requests and role boundaries',
      'Test the degraded paths on purpose: no provider configured, duplicate callbacks, incomplete CSV',
      'Check keyboard access, focus order, contrast and reduced-motion behaviour on real pages',
    ],
    artefacts: [
      'Test suites for domain logic, API behaviour and primary user journeys',
      'Coverage notes describing which behaviours are and are not exercised',
      'Accessibility and responsive review notes per interface',
    ],
  },
  {
    id: 'improve',
    title: 'Improve',
    summary:
      'Use evidence — test results, learner and teacher feedback, observed limitations, data-quality reports — to decide what to change next, and describe the result honestly.',
    practices: [
      'Record known limitations in the project documentation instead of leaving them implied',
      'Treat data-quality reports as product input, since thin data changes what a metric can support',
      'Prioritise changes that remove a specific failure over changes that only look better',
      'Publish improvements as measured or unmeasured, never as claimed learning impact',
    ],
    artefacts: [
      'Known-limitations and roadmap sections per project',
      'Documented metric and model definitions, versioned when they change',
      'A short review of what was measured and what remains unverified',
    ],
  },
];
