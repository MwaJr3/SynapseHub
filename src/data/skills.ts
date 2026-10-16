import type { SkillGroup } from '@/types';

/**
 * Skills presented as evidence, grouped by capability and linked to the
 * projects that demonstrate them. No proficiency percentages are shown: there
 * is no defensible measurement behind such a number here.
 */
export const skillGroups: SkillGroup[] = [
  {
    id: 'programming-backend',
    title: 'Programming and backend development',
    summary:
      'Python services with typed contracts, relational modelling and background work for everything that should not block a request.',
    items: [
      'Python',
      'FastAPI',
      'Pydantic validation and schemas',
      'SQLAlchemy and Alembic migrations',
      'REST API design and error formats',
      'Background jobs and task queues (Celery, scheduled aggregation)',
      'Redis for queues, presence and de-duplication keys',
    ],
    evidenceSlugs: [
      'learnbridge',
      'pathwise',
      'teachcraft',
      'learnpulse',
      'reachlearn',
    ],
  },
  {
    id: 'frontend',
    title: 'Frontend development',
    summary:
      'React and TypeScript interfaces built from reusable components, designed to degrade honestly when something upstream is unavailable.',
    items: [
      'React and TypeScript',
      'Semantic HTML and modern CSS',
      'Tailwind CSS and design tokens',
      'Component-driven architecture',
      'Form validation and optimistic updates with rollback',
      'Responsive layout for phone, tablet and desktop',
      'Accessible UI: focus management, keyboard support, reduced motion',
      'Progressive Web App patterns',
    ],
    evidenceSlugs: ['learnbridge', 'classconnect', 'teachcraft'],
  },
  {
    id: 'data-persistence',
    title: 'Data and persistence',
    summary:
      'Relational modelling, indexing and bounded analytical work, plus browser storage for everything that has to survive a dropped connection.',
    items: [
      'PostgreSQL schema design, constraints and indexes',
      'SQL query writing and aggregation',
      'SQLite for local development and tests',
      'IndexedDB and browser storage for offline data',
      'Data validation, normalisation and deduplication',
      'Event ingestion with idempotency keys',
      'Pandas or Polars for bounded analytics tasks',
      'Report and export generation',
    ],
    evidenceSlugs: ['learnpulse', 'learnbridge', 'pathwise'],
  },
  {
    id: 'education-technology',
    title: 'Education technology and learning design',
    summary:
      'The domain understanding behind the products: how courses, skills, sessions, licences and access workflows actually behave.',
    items: [
      'Course, module and lesson delivery models',
      'Offline-first synchronisation design',
      'Quiz and assessment workflows with versioning',
      'Skill and prerequisite modelling',
      'Learning-path recommendation with stated rationale',
      'Teacher authoring and review workflows',
      'Resource attribution, licensing and localisation',
      'Class scheduling, attendance and asynchronous follow-up',
      'Consent-based mobile learning delivery',
      'Scholarship, waiver and sponsored-seat workflows',
    ],
    evidenceSlugs: [
      'learnbridge',
      'pathwise',
      'teachcraft',
      'openlearn-commons',
      'eduaccess',
    ],
    caveat:
      'These are implementation capabilities demonstrated in the portfolio projects — not credentials, teaching qualifications or institutional affiliations.',
  },
  {
    id: 'ai-applications',
    title: 'AI and intelligent applications',
    summary:
      'Model integration treated as one replaceable component of a larger system, with validation, cost control and a human in the loop.',
    items: [
      'Provider-agnostic LLM integration behind an adapter',
      'Retrieval-augmented generation over approved material',
      'Source grounding and citation verification',
      'Structured output validation against a typed schema',
      'Prompt design, input limits and prompt-injection defences for retrieved text',
      'Long-document ingestion and chunking',
      'Evaluation planning and human review workflows',
      'Provider failure, timeout and cost handling',
    ],
    evidenceSlugs: ['tutorspring', 'teachcraft', 'pathwise'],
    caveat:
      'No model accuracy, benchmark or learning-gain figure is published for these features because no formal evaluation has been run.',
  },
  {
    id: 'reliability-security-privacy',
    title: 'Reliability, security and privacy',
    summary:
      'The unglamorous parts that decide whether a learning tool can be trusted with a child\u2019s progress or a family\u2019s application.',
    items: [
      'Authentication with learner, teacher, reviewer and administrator roles',
      'Server-side ownership and membership checks on every endpoint',
      'Input validation and allowlisted rich-text sanitisation',
      'Secure upload handling with type and size limits',
      'Rate limiting on public and model-backed endpoints',
      'Privacy-aware reporting with small-cohort suppression',
      'Audit events for decisions, publications and allocations',
      'Consent, opt-out and retention controls',
      'Idempotent, signature-verified webhook handling',
      'Automated tests and documented failure recovery',
    ],
    evidenceSlugs: ['learnpulse', 'eduaccess', 'reachlearn', 'classconnect'],
    caveat:
      'These are engineering practices evidenced in the project implementations, not certifications or claims of regulatory compliance.',
  },
];
