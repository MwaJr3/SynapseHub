import type { PortfolioProject } from '@/types';

export const learnbridge: PortfolioProject = {
  id: 'project-01-learnbridge',
  slug: 'learnbridge',
  name: 'LearnBridge',
  shortDescription:
    'An offline-first e-learning platform that delivers structured courses, quizzes and progress tracking to learners on intermittent or expensive connections.',
  longDescription:
    'LearnBridge treats connectivity as a variable rather than an assumption. Courses are structured as modules and lessons, learners download the packs they intend to study, and progress made without a network is queued locally and merged back when a connection returns — with the sync state always visible instead of hidden behind a spinner.',
  primaryCategory: 'Education Technology / E-Learning / Accessibility',
  categories: [
    'offline-first',
    'mobile-low-bandwidth',
    'assessment-analytics',
    'full-stack',
    'python',
  ],
  technologies: [
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Vite',
    'Python',
    'FastAPI',
    'Pydantic',
    'SQLAlchemy',
    'PostgreSQL',
    'IndexedDB',
    'Service workers',
    'S3-compatible object storage',
  ],
  featureTags: [
    'Downloadable lesson packs',
    'Progress sync queue',
    'IndexedDB',
    'Quizzes',
    'Course versioning',
  ],
  features: [
    {
      title: 'Course catalogue and enrolment',
      description:
        'Courses expose subject, level, language, estimated study time, accessibility notes and licence attribution, so a learner can judge whether a course fits before committing to a download.',
      importance:
        'Learners on metered data need to know the size and format cost of a course before starting it.',
    },
    {
      title: 'Structured modules and lessons',
      description:
        'Lessons are composed of ordered blocks: text, images, audio, downloadable documents, worked examples and lightweight video links.',
      importance:
        'A predictable structure makes offline packs predictable to assemble and to read on a small screen.',
    },
    {
      title: 'Downloadable lesson packs',
      description:
        'Selected lessons and their supported media are stored in IndexedDB through a service worker, and the interface states exactly which items are available offline.',
      importance:
        'Claiming "offline support" without naming what is stored is the fastest way to lose a learner\u2019s trust.',
    },
    {
      title: 'Local progress queue and synchronisation',
      description:
        'Progress events are recorded locally as an append-only queue, marked pending, and uploaded idempotently when connectivity returns. Last successful sync and pending counts are shown on every screen.',
      importance:
        'Progress is the one thing a learner cannot recreate, so it must survive a closed browser and a dropped connection.',
    },
    {
      title: 'Conflict handling that never discards\u00a0work',
      description:
        'The server merges per-field: completion and attempts are additive, so a stale local record can never downgrade progress. Duplicate delivery of the same event is ignored by key.',
      importance:
        'Silent progress loss is the failure learners report and the reason they stop trusting an offline app.',
    },
    {
      title: 'Quizzes with explanations',
      description:
        'Multiple-choice, multi-select, true/false and short-answer questions, with attempt history and answer explanations released according to course settings.',
      importance:
        'Practice only teaches when learners can see why an answer was wrong.',
    },
    {
      title: 'Bookmarks, notes and continue-learning',
      description:
        'Learners keep their own notes and bookmarks, search within a course, filter the catalogue, and resume from a single continue-learning entry point.',
      importance:
        'Interrupted study is the normal case in low-connectivity contexts, not the exception.',
    },
    {
      title: 'Course versioning and attribution',
      description:
        'Publishing a revised course increments a version and marks affected offline packs as outdated, so a learner knows when their downloaded copy has moved on.',
      importance:
        'Downloaded content drifts from published content; the interface has to say so plainly.',
    },
  ],
  visualLabel: 'Illustrative offline-library and sync-state preview',
  previews: [
    {
      id: 'learnbridge-primary',
      view: 'primary',
      alt: 'Illustrative preview of a course catalogue with downloaded lesson packs and a sync status strip.',
      caption:
        'Course library with per-item offline availability and the sync status strip.',
      isIllustrative: true,
    },
    {
      id: 'learnbridge-detail',
      view: 'detail',
      alt: 'Illustrative preview of an offline sync queue showing pending, synced and conflicting progress entries.',
      caption:
        'Sync queue: pending events, last successful sync and a recoverable conflict.',
      isIllustrative: true,
    },
  ],
  architecture: [
    {
      id: 'pwa',
      label: 'React + TypeScript PWA',
      layer: 'client',
      description:
        'Course library, lesson reader, quizzes and sync indicators.',
      connectsTo: ['offline-store', 'api'],
    },
    {
      id: 'service-worker',
      label: 'Service worker + cache',
      layer: 'client',
      description:
        'Caches the application shell and lesson pack assets for repeat visits.',
      connectsTo: ['offline-store'],
    },
    {
      id: 'offline-store',
      label: 'IndexedDB store',
      layer: 'client',
      description:
        'Lesson packs, notes, bookmarks and the pending progress queue.',
      connectsTo: ['sync-client'],
    },
    {
      id: 'sync-client',
      label: 'Synchronisation client',
      layer: 'client',
      description:
        'Uploads queued events idempotently, retries with backoff and surfaces conflicts.',
      connectsTo: ['api'],
    },
    {
      id: 'api',
      label: 'FastAPI service',
      layer: 'api',
      description:
        'Pydantic-validated endpoints for courses, enrolments, attempts and sync batches.',
      connectsTo: ['domain'],
    },
    {
      id: 'domain',
      label: 'Domain services',
      layer: 'domain',
      description:
        'Course access rules, quiz grading, completion requirements and the sync merge policy.',
      connectsTo: ['database'],
    },
    {
      id: 'database',
      label: 'PostgreSQL',
      layer: 'data',
      description:
        'Courses, versions, enrolments, attempts, bookmarks, notes and sync events.',
    },
    {
      id: 'object-storage',
      label: 'Object storage',
      layer: 'integration',
      description:
        'Lesson media, served through short-lived signed URLs and also packaged for offline download.',
    },
  ],
  caseStudy: {
    problem:
      'Learners who study with intermittent or expensive connectivity cannot rely on a streaming-first course platform. Lessons buffer, downloads restart, and progress recorded during a dropout disappears. The practical result is that learners abandon digital courses precisely because the platform assumes a network they do not have.',
    users: [
      'School and adult learners with metered or unstable connections',
      'Teachers running blended or community learning programmes',
      'Education organisations distributing structured course content',
      'Course managers publishing and revising lesson material',
    ],
    constraints: [
      'Storage on low-end devices is limited, so lesson packs must be explicit and removable.',
      'Media cannot be assumed downloadable: audio and documents can be packed, heavy video links cannot.',
      'Learners may be minors, so records are minimised and no learner is identifiable from cached content.',
      'Progress correctness matters more than immediacy — a wrong answer is worse than a late one.',
    ],
    workflow: [
      {
        title: 'Discover and enrol',
        description:
          'Browse the catalogue, read level, language and offline availability for a course, then enrol.',
      },
      {
        title: 'Download a lesson pack',
        description:
          'Select lessons and supported media; the pack size and what is included are shown before download.',
      },
      {
        title: 'Study offline',
        description:
          'Read lessons, take notes, bookmark and complete practice while the connection is absent.',
      },
      {
        title: 'Queue progress locally',
        description:
          'Every completion, attempt and note change is written to IndexedDB and marked pending.',
      },
      {
        title: 'Synchronise on reconnection',
        description:
          'The sync client uploads queued events in batches, retrying safely without producing duplicates.',
      },
      {
        title: 'Resolve and confirm',
        description:
          'Merged progress is confirmed with a last-successful-sync timestamp; conflicts are shown with a retry control.',
      },
    ],
    engineeringDecisions: [
      {
        title: 'Offline support is declared per item, not for the platform',
        description:
          'Each lesson and media asset carries a download state, and the reader renders a clear "connection required" affordance for anything not stored locally. There is no global offline claim.',
      },
      {
        title: 'Progress is an append-only event log',
        description:
          'Local changes are events with a client-generated key, uploaded as an idempotent batch. The server records unique keys, so repeated retries after a partial failure cannot double-count an attempt.',
      },
      {
        title: 'Merge policy favours the learner',
        description:
          'Completion is monotonic and attempts are additive: merging can only move progress forward. The only field where a later timestamp wins is a learner-editable note, so a stale device cannot erase newer work.',
      },
      {
        title: 'Content versioning drives cache invalidation',
        description:
          'Published revisions increment the course version; the client compares versions and marks stored packs as outdated rather than silently serving stale material.',
      },
      {
        title: 'Role checks live on the server',
        description:
          'Learner, instructor and administrator permissions are enforced in FastAPI dependencies. The client hides controls, but hiding a control is a UX decision, never an authorisation boundary.',
      },
      {
        title: 'Storage credentials never reach the browser',
        description:
          'Media is delivered through short-lived signed URLs generated server-side, so object-store keys cannot be extracted from the client bundle.',
      },
    ],
    testing: [
      'Quiz grading across every question type, including partial credit and explanation release rules.',
      'Course access and enrolment permissions for learner, instructor and administrator roles.',
      'Offline queue behaviour: events written while disconnected, then replayed in order.',
      'Sync recovery after interruption, and deduplication of a replayed batch.',
      'Conflict resolution rules, including that a stale client cannot reduce completion.',
      'Pack assembly, including that undeclared assets are not reported as available offline.',
    ],
    limitations: [
      'Only downloaded items work offline. Streaming media and course browsing for undownloaded courses require a connection.',
      'Conflict resolution is field-level merge with explicit rules, not a general-purpose CRDT, so simultaneous edits to the same note are resolved by timestamp rather than merged.',
      'Large packs can exceed the storage available on very low-end devices; the client warns before download but does not yet compress media.',
      'Guardian consent flows for minors are deployment-dependent and must be configured by the operator.',
    ],
    futureImprovements: [
      'Resumable, chunked pack downloads for connections that drop mid-transfer.',
      'Peer-to-peer pack sharing between devices on the same local network.',
      'Selectable media quality tiers so a learner can trade file size against fidelity.',
      'Optional Web Push reminders where the browser and platform support them.',
    ],
  },
  featured: true,
  status: 'completed',
  displayOrder: 1,
  relatedSlugs: ['classconnect', 'pathwise', 'reachlearn', 'tutorspring'],
  demoRequirements:
    'A demo runs on the seeded course set. Full offline behaviour needs a browser that supports service workers and IndexedDB; no third-party credentials are required.',
};
