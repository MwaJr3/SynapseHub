import type { PortfolioProject } from '@/types';

export const eduaccess: PortfolioProject = {
  id: 'project-09-eduaccess',
  slug: 'eduaccess',
  name: 'EduAccess',
  shortDescription:
    'A platform for free learning plans, scholarships, fee waivers and sponsored seats, with reviewable decisions and auditable allocation of the support that funds them.',
  longDescription:
    'EduAccess makes the money side of education access legible. Providers publish access plans, learners apply through a low-friction form with minimal evidence, reviewers decide with a recorded reason, and seats are allocated from funding pools whose available, committed and allocated totals stay consistent. Sponsors see aggregate outcomes, never applicant files; payments are adapter-based, and where no provider is configured the workflow says "manually reconciled" instead of pretending a transaction succeeded.',
  primaryCategory:
    'Education Technology / Access and Affordability / Workflow Management',
  categories: ['affordable-access', 'full-stack', 'python'],
  technologies: [
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Python',
    'FastAPI',
    'Pydantic',
    'SQLAlchemy',
    'PostgreSQL',
    'Background jobs',
    'Optional payment-provider adapter',
  ],
  featureTags: [
    'Access plans',
    'Seat allocation',
    'Human review',
    'Audit trail',
    'Reconciliation',
  ],
  features: [
    {
      title: 'Access plans per course',
      description:
        'Courses offer free, subsidised, scholarship-funded, sponsor-funded or paid plans with the terms attached to each.',
      importance:
        'Learners need to know what a course costs them before they invest hope in it.',
    },
    {
      title: 'Low-friction applications',
      description:
        'Scholarship and fee-waiver applications collect only what the configured eligibility criteria require, with drafts and validation instead of a document dump.',
      importance:
        'Every extra field excludes learners, and sensitive documents are a liability to hold.',
    },
    {
      title: 'Funding pools and eligibility windows',
      description:
        'Sponsors and administrators define pools with eligibility criteria, application windows, available places and reporting requirements.',
      importance:
        'Unbounded support is not fundable; windows and caps are what make a programme finite and reportable.',
    },
    {
      title: 'A reviewable decision workflow',
      description:
        'Applications move through submitted, needs information, under review, approved, waitlisted, declined, enrolled, completed and withdrawn, with a decision reason and reviewer recorded.',
      importance:
        'A learner who is declined deserves a reason and a route to correction, not silence.',
    },
    {
      title: 'Seat allocation with enforced invariants',
      description:
        'Allocation reserves seats from a pool transactionally, and available, committed and allocated counts are kept consistent so a pool cannot be oversubscribed by concurrent decisions.',
      importance:
        'Over-allocating sponsored seats means turning away learners who were told they had a place.',
    },
    {
      title: 'Human-reviewed, explainable eligibility',
      description:
        'Eligibility rules are evaluated and displayed as factors for the reviewer; allocation decisions are made by people, and no applicant is ranked by an opaque model.',
      importance:
        'Consequential decisions about people need an accountable human in the loop and a reason on the record.',
    },
    {
      title: 'Sponsor reporting with privacy boundaries',
      description:
        'Sponsors see aggregate seats funded, enrolment and completion for their own programme only, never applicant files or other sponsors\u2019 data.',
      importance:
        'Funding access requires visibility into outcomes without handing over private learner applications.',
    },
    {
      title: 'Honest financial states',
      description:
        'Payments are handled through an adapter where configured; otherwise the workflow uses a labelled manual reconciliation path. Pending, succeeded, failed, refunded and manually reconciled transactions stay distinct.',
      importance:
        'A pending payment shown as settled corrupts every downstream record and breaks trust with finance.',
    },
  ],
  visualLabel: 'Illustrative access-plan and seat-allocation preview',
  previews: [
    {
      id: 'eduaccess-primary',
      view: 'primary',
      alt: 'Illustrative preview of a course access plan panel with free, sponsored and paid options.',
      caption:
        'Access plans for a course: free, sponsored seats and paid places.',
      isIllustrative: true,
    },
    {
      id: 'eduaccess-detail',
      view: 'detail',
      alt: 'Illustrative preview of a reviewer queue and a seat allocation table showing available, committed and allocated totals.',
      caption:
        'Review queue and seat allocation with committed versus available totals.',
      isIllustrative: true,
    },
  ],
  architecture: [
    {
      id: 'client',
      label: 'React + TypeScript client',
      layer: 'client',
      description:
        'Access-plan pages, application flow, reviewer queue, allocation table and reconciliation view.',
      connectsTo: ['api'],
    },
    {
      id: 'api',
      label: 'FastAPI service',
      layer: 'api',
      description:
        'Applications, decisions, pools, allocations, enrolments and reports with field-level permissions.',
      connectsTo: ['workflow'],
    },
    {
      id: 'workflow',
      label: 'Application workflow',
      layer: 'domain',
      description:
        'State transitions, decision reasons, waitlists, appeals and the transition history.',
      connectsTo: ['eligibility', 'database'],
    },
    {
      id: 'eligibility',
      label: 'Eligibility rules',
      layer: 'domain',
      description:
        'Configurable criteria evaluated into explicit factors presented to a human reviewer.',
      connectsTo: ['allocation'],
    },
    {
      id: 'allocation',
      label: 'Seat allocation',
      layer: 'domain',
      description:
        'Transactional reservation from funding pools with available, committed and allocated invariants.',
      connectsTo: ['database'],
    },
    {
      id: 'payments',
      label: 'Payment adapter',
      layer: 'integration',
      description:
        'Provider-configurable payments with webhook verification, or a labelled manual reconciliation path.',
      connectsTo: ['database'],
    },
    {
      id: 'worker',
      label: 'Background jobs',
      layer: 'worker',
      description:
        'Decision notifications, sponsor report generation and retention cleanup.',
      connectsTo: ['database'],
    },
    {
      id: 'database',
      label: 'PostgreSQL',
      layer: 'data',
      description:
        'Plans, applications, decisions, pools, allocations, enrolments, transactions, appeals and audit events.',
    },
  ],
  caseStudy: {
    problem:
      'Learners who cannot pay are usually managed with spreadsheets, message threads and goodwill. Sponsors cannot see whether their funding is being used, providers cannot prove how decisions were made, and learners wait without knowing whether their application was even read. Support exists; the workflow around it is what fails.',
    users: [
      'Learners applying for a waiver, scholarship or sponsored seat',
      'Scholarship reviewers and finance administrators',
      'Course providers offering subsidised learning',
      'Sponsors and employers funding seats for a cohort',
    ],
    constraints: [
      'Applications contain sensitive personal information, so data minimisation and access control are non-negotiable.',
      'Eligibility decisions affect people\u2019s access to learning and therefore require human review and recorded reasons.',
      'A sponsor must never be able to browse another programme\u2019s applicants.',
      'Payment state is not binary: pending, failed and refunded must never be presented as settled.',
    ],
    workflow: [
      {
        title: 'Publish an access plan',
        description:
          'The provider defines free, subsidised, sponsored or paid access for a course, plus eligibility criteria and any application window.',
      },
      {
        title: 'Apply',
        description:
          'The learner submits a low-friction application with only the fields the criteria require, and can save a draft.',
      },
      {
        title: 'Review',
        description:
          'A reviewer sees the criteria factors, can request missing information and records a decision with a reason.',
      },
      {
        title: 'Allocate a seat',
        description:
          'Approval reserves a seat from a funding pool transactionally and updates committed and available totals.',
      },
      {
        title: 'Enrol',
        description:
          'The learner is enrolled on the course under the funded plan, with the support source recorded.',
      },
      {
        title: 'Report and reconcile',
        description:
          'Sponsors receive aggregate reporting; finance reconciles transactions or manual ledger entries with explicit states.',
      },
    ],
    engineeringDecisions: [
      {
        title: 'An explicit workflow with recorded history',
        description:
          'Every application transition is a state change with an actor, timestamp and reason stored as an audit event, which is what makes an appeal answerable.',
      },
      {
        title: 'Eligibility as visible factors',
        description:
          'Rules evaluate to a structured list of met and unmet criteria that the reviewer sees, so a decision can be explained to the applicant without reverse-engineering a score.',
      },
      {
        title: 'Transactional seat allocation',
        description:
          'Reserving a seat locks the pool row and re-checks the available count, so two concurrent approvals cannot allocate the same seat or oversubscribe a pool.',
      },
      {
        title: 'Permissions that isolate sponsors',
        description:
          'Sponsor access is scoped at the query level to their own funding programme and limited to aggregates, so applicant documents are unreachable even by constructing an API call directly.',
      },
      {
        title: 'Money never has an assumed state',
        description:
          'Payment adapter webhooks are signature-verified and idempotent, each transaction carries a distinct status, and refunds and reversals are stored as their own records rather than editing history.',
      },
      {
        title: 'Manual reconciliation as a first-class path',
        description:
          'Where no payment provider is configured, the workflow records a manual ledger entry with a reference and timestamp, labelled as manually reconciled instead of simulating a successful charge.',
      },
    ],
    testing: [
      'Application state transitions, including rejection of invalid transitions and appeal handling.',
      'Allocation limits under concurrency, and consistency of available, committed and allocated totals.',
      'Reviewer and administrator permission checks for decisions and field-level applicant data.',
      'Sponsor isolation: requests for other programmes return no records.',
      'Payment callback verification, duplicate delivery and refund or reversal handling.',
      'Reconciliation totals and report accuracy against recorded ledger entries.',
      'Retention and deletion behaviour for expired applications and their supporting documents.',
    ],
    limitations: [
      'The platform supports a fair process; fairness of the process is not guaranteed or measured, and no outcome claim is made.',
      'Eligibility criteria are configuration, so a poorly designed criterion will still exclude learners.',
      'Card data is never stored: any payment handling is delegated to a configured provider.',
      'Without a payment provider, the workflow depends on staff discipline to reconcile manual entries, and the interface says so.',
      'Supporting documents are unnecessary in many programmes but permitted where a criterion requires them; the privacy burden then falls on the operator\u2019s retention settings.',
    ],
    futureImprovements: [
      'Configurable decision templates with a library of wording that reviewers can adapt.',
      'Waitlist automation that notifies the next eligible applicant when a seat is released.',
      'Anonymised review mode, so first-pass decisions can be made without applicant identity fields.',
      'Multi-currency support with exchange-rate handling, if programmes operate across regions.',
    ],
  },
  featured: false,
  status: 'completed',
  displayOrder: 9,
  relatedSlugs: ['reachlearn', 'openlearn-commons', 'learnpulse'],
  demoRequirements:
    'Runs with synthetic applications, funding pools and ledger entries demonstrating both a configured payment adapter and a manual reconciliation path. No live payment credentials are required.',
};
