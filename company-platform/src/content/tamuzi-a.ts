/** Tamuzi Learning (working name) — company record and product catalogue 14–19. */
import type { CompanyContent, ProductContent, SolutionContent } from './types';

export const tamuziCompany: CompanyContent = {
  slug: 'tamuzi-learning',
  name: 'Tamuzi Learning',
  workingNameNotice:
    'Tamuzi Learning is a working name used while trademark checks are pending. Legal registration details will be added after official registration.',
  tagline: 'Learning tools built around real classrooms, real campuses, real learners.',
  overview:
    'Tamuzi Learning is an education technology company (working name). It builds learning platforms, campus operations tools, accessibility-focused applications, and educational data products for schools, training providers, NGOs, and learners — designed around actual educational workflows rather than generic software patterns.',
  focusAreas: [
    'Learning platforms and course delivery',
    'Campus and training operations',
    'Learning accessibility and inclusion',
    'Educational data and teacher support',
  ],
  aboutStory:
    'Tamuzi Learning began as a portfolio of education software — tools for campuses, classrooms, tutors, and learners built from studying how education actually works day to day. The company (working name) exists to carry that work forward as products: practical, inclusive, and honest about evidence. It is registered as a separate business and operates independently of any other company on this platform.',
  values: [
    'Design from the real workflow, not the generic template',
    'Accessibility and inclusion are requirements, not features',
    'Educational claims need educational evidence',
    'Learner data is borrowed, not owned',
  ],
  approach: [
    'Study the actual users — administrators, teachers, tutors, learners',
    'Model the workflow faithfully before building the interface',
    'Test with the people the tool is for',
    'State honestly what has and has not been validated in real settings',
  ],
  accentToken: 'tamuzi',
  featuredProductSlugs: ['campusflow', 'learnpulse', 'reachlearn'],
  featuredCaseStudySlugs: [
    'campusflow-case-study',
    'tutorspring-case-study',
  ],
};

export const tamuziSolutions: SolutionContent[] = [
  {
    slug: 'learning-platforms-and-course-delivery',
    title: 'Learning platforms and course delivery',
    companySlug: 'tamuzi-learning',
    problem:
      'Schools, training providers, and tutors deliver learning through tools that rarely fit their actual model — courses run on spreadsheets and messaging apps, remote lessons collapse on weak connections, and generic LMS platforms bring more ceremony than value.',
    approach:
      'Course delivery and teaching products (LearnBridge, ClassConnect, TutorSpring, TeachCraft, CyberAware Lab) model the real structures — modules, sessions, tutoring dialogues, authoring workflows — resilient to the connectivity and staffing constraints their users actually have. Each product documents its workflow honestly and treats deployment as a separate step from building.',
    audiences: [
      'Schools and training providers',
      'Teachers and tutors',
      'Learners on constrained connections',
    ],
  },
  {
    slug: 'learning-accessibility-inclusion-and-data',
    title: 'Learning accessibility, inclusion, and data',
    companySlug: 'tamuzi-learning',
    problem:
      'Learners with different abilities, devices, bandwidths, and budgets are systematically excluded by education software designed for one ideal setting — and the programmes serving them need data they can trust without vanity metrics.',
    approach:
      'Access-first products (EduAccess, ReachLearn, OpenLearn Commons, LearnPulse, PathWise, TranscriptWise) treat low bandwidth, alternate channels (SMS/USSD/IVR), open licensing, affordability, and explainable assessment as core requirements. Claims about educational impact stay labelled as unvalidated until real evidence exists.',
    audiences: [
      'Schools and NGOs serving learners with limited connectivity or funds',
      'Programme managers who need honest data',
      'Inclusive-education coordinators',
    ],
  },
];

export const tamuziProducts: ProductContent[] = [
  {
    slug: 'cyberaware-lab',
    name: 'CyberAware Lab',
    companySlug: 'tamuzi-learning',
    category: 'Education Technology',
    categories: ['Education Technology', 'Learning and Accessibility'],
    purpose:
      'Teaches secure online practices through lessons, fictional scenarios, quizzes, and progress tracking.',
    summary:
      'An interactive cybersecurity awareness platform: structured lessons, safe fictional simulations, scenario-based exercises with answer explanations, learning paths, and privacy-conscious progress tracking.',
    status: 'BUILT',
    statusNote:
      'Built and tested locally with a dedicated frontend, backend, automated tests, documentation and local demo; not publicly deployed. Real-cohort educational effectiveness is not claimed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL'],
    features: [
      {
        title: 'Structured lessons and learning paths',
        description:
          'Sequenced lessons with clear objectives build secure-practice habits step by step.',
      },
      {
        title: 'Safe fictional simulations',
        description:
          'Scenario-based exercises use fictional content only — never real credentials or live deceptive campaigns.',
      },
      {
        title: 'Explanations and progress',
        description:
          'Answer explanations teach reasoning; progress tracking is privacy-conscious and aggregate by default.',
      },
    ],
    keywords: ['security awareness', 'education', 'quizzes', 'simulations', 'learning paths'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Educational effectiveness in real cohorts is unvalidated and not claimed.',
    featured: true,
    caseStudy: {
      title: 'CyberAware Lab: security awareness practised, not preached',
      problem:
        'Security awareness in schools and NGOs is usually a poster or a slide deck. CyberAware Lab was designed to teach secure online practices through structured lessons, fictional scenarios, quizzes with explanations, and progress tracking — practising recognition and decision-making, safely and without ever collecting real passwords or running deceptive campaigns against unsuspecting recipients.',
      users: [
        'Schools and NGOs running digital-safety programmes',
        'Instructors without security expertise',
        'Learners building everyday secure habits',
      ],
      constraints: [
        'Never collect real passwords; never run deceptive campaigns against real recipients',
        'All simulations explicitly fictional',
        'Progress tracking privacy-conscious; aggregate reports by default',
        'No educational-impact claims without evidence',
      ],
      solution:
        'CyberAware Lab delivers structured lessons and scenario-based exercises where learners judge fictional situations (suspicious messages, unsafe links, password habits) and receive explanatory feedback on their answers. Learning paths sequence the curriculum; instructor-managed content adapts it to a programme; progress tracking records participation privacy-consciously; aggregate reports and review recommendations support instructors without scoring learners publicly.',
      workflow: [
        {
          step: 'Learn',
          description:
            'Learners work through lessons with objectives and short checks at each step.',
        },
        {
          step: 'Practise',
          description:
            'Fictional scenarios present decisions; every answer gets an explanation of the reasoning.',
        },
        {
          step: 'Review',
          description:
            'Instructors see aggregate progress and review recommendations; no learner is publicly ranked.',
        },
      ],
      architecture:
        'Python/FastAPI backend with a content model (lessons, scenarios, quizzes) and a React/TypeScript frontend; PostgreSQL stores content and privacy-conscious progress records. Instructor management is role-scoped; scenario content is validated as fictional at authoring time.',
      dataModel:
        'LearningPaths → Lessons (objectives) → Scenarios/Quizzes (fictional content, explanations) → ProgressRecords (learner, participation facts) → AggregateReports.',
      engineeringDecisions: [
        {
          decision: 'Fictional-content validation at authoring time',
          rationale:
            'The brief’s safety rules (no real passwords, no live campaigns) are enforced where content is created.',
        },
        {
          decision: 'Aggregate reporting by default',
          rationale:
            'Progress data about security behaviour is sensitive; aggregation-first protects learners while serving instructors.',
        },
      ],
      testing:
        'Content-model and quiz-flow tests, explanation rendering for every answer path, privacy tests on progress records (aggregation defaults), and role-scoped instructor tests. Learning-outcome testing with real cohorts is future work, explicitly not claimed.',
      securityPrivacy:
        'No real credentials are ever requested or stored; scenario content is fictional and labelled; progress records are minimal and aggregation-first.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Educational effectiveness unvalidated in real cohorts',
        'Curriculum bounded by the authored content set',
        'Not publicly deployed',
      ],
      futureImprovements: [
        'Consented pilot programmes with documented evaluation',
        'Additional language versions of core lessons',
      ],
    },
  },
  {
    slug: 'campusflow',
    name: 'CampusFlow',
    companySlug: 'tamuzi-learning',
    category: 'Education Technology',
    categories: ['Education Technology', 'Software Engineering'],
    purpose:
      'Organizes student records, courses, enrolments, academic results, and administrative workflows.',
    summary:
      'A university management system: authenticated access, role permissions, student and course CRUD, enrolment records, academic results, search and filtering, dashboards, and reports — with responsible access to academic records.',
    status: 'BUILT',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed. No real institutions are named or implied.',
    technologies: ['Python', 'Django', 'PostgreSQL', 'HTML', 'Tailwind CSS', 'pytest'],
    features: [
      {
        title: 'Student, course, and enrolment records',
        description:
          'Relational records with validation that match academic structures.',
      },
      {
        title: 'Academic results and reporting',
        description:
          'Result capture with dashboards and reports for administrative workflows.',
      },
      {
        title: 'Role permissions and authentication',
        description:
          'Role separation enforced server-side for responsible access to academic records.',
      },
    ],
    keywords: ['university', 'administration', 'enrolment', 'student records', 'django'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief; real-institution deployment and adoption require verification.',
    featured: true,
    caseStudy: {
      title: 'CampusFlow: university administration with responsible access',
      problem:
        'Universities run on student records, courses, enrolments, and results — data whose accuracy matters and whose exposure harms real people. CampusFlow was designed as a management system for these workflows: CRUD over the core records with validation, role-separated access, search and filtering, dashboards and reports — with responsible access to academic records as a design pillar, not an afterthought.',
      users: [
        'University administrative staff',
        'Department officers managing enrolment and results',
        'Students learning administrative systems design',
      ],
      constraints: [
        'Academic records are sensitive personal data — access must be role-separated',
        'Validation must match academic rules (enrolment prerequisites, result ranges)',
        'Relational integrity over convenience',
      ],
      solution:
        'CampusFlow (Django/PostgreSQL) models students, courses, enrolments, and academic results as validated relational records. Role permissions separate registrar, department, and read-only access; every record change flows through validated workflows. Search and filtering serve administrative queries; dashboards and reports compile operational views with access-scoped data.',
      workflow: [
        {
          step: 'Record',
          description:
            'Administrators create and maintain student and course records with validation.',
        },
        {
          step: 'Enrol',
          description:
            'Enrolment records link students to courses under academic rules; changes are validated and tracked.',
        },
        {
          step: 'Report',
          description:
            'Results, dashboards, and reports serve administrative workflows within role scope.',
        },
      ],
      architecture:
        'A Django application with PostgreSQL; Django’s authentication and permission framework enforces role separation server-side; server-rendered HTML with Tailwind CSS keeps the interface fast and accessible; pytest covers model validation and workflow tests.',
      dataModel:
        'Students → Enrolments (course refs, states) → Courses (requirements) → Results (validated ranges) → Role-scoped user accounts.',
      engineeringDecisions: [
        {
          decision: 'Django admin-grade validation in domain models',
          rationale:
            'Academic-record correctness is a data-modelling problem; validation lives in models so no interface can bypass it.',
        },
        {
          decision: 'Role permissions enforced server-side from day one',
          rationale:
            'The brief’s responsible-access rule: academic records need structural access control, not UI concealment.',
        },
      ],
      testing:
        'pytest suites over model validation (academic rules), role-permission matrices, enrolment workflows, and report scoping. Fixtures are synthetic academic records (labelled); no real institutional data is used.',
      securityPrivacy:
        'Academic records are sensitive personal data; access is role-separated and can be audited; the product documents its data-handling model for institutional review.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Administrative core only — not finance, transport, or full ERP',
        'Institutional validation and deployment status unverified',
      ],
      futureImprovements: [
        'Guardian/student portal with consent-aware access',
        'Configured report scheduling',
      ],
    },
  },
  {
    slug: 'transcriptwise',
    name: 'TranscriptWise',
    companySlug: 'tamuzi-learning',
    category: 'AI and Intelligent Applications',
    categories: ['AI and Intelligent Applications', 'Education Technology'],
    purpose:
      'Uses supported transcript inputs to create organized study guides and other learning materials.',
    summary:
      'A YouTube transcript and learning intelligence tool: transcript retrieval or manual/upload entry, AI-assisted study guides, concept explanations, quizzes and flashcards — with transcript-derived claims kept distinct from AI interpretation.',
    status: 'BUILT',
    statusNote:
      'Built and tested locally with a dedicated frontend, backend, automated tests, documentation and local demo; not publicly deployed. AI-generated content requires human review; provider limits apply.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'Tailwind CSS', 'Pydantic', 'PostgreSQL', 'Configurable AI provider'],
    features: [
      {
        title: 'Multiple transcript inputs',
        description:
          'YouTube URL retrieval where supported, manual entry, and TXT/SRT/VTT upload — with a review step before analysis.',
      },
      {
        title: 'Learning materials from transcripts',
        description:
          'Study guides, concept explanations, actionable steps, quizzes, and flashcards with source-segment references.',
      },
      {
        title: 'Saved library and search',
        description:
          'Long-document handling, saved materials, search, and exports.',
      },
    ],
    keywords: ['transcripts', 'youtube', 'study guides', 'AI', 'learning tools', 'flashcards'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Transcript-derived claims and AI-generated interpretation are kept distinct; AI output requires human review.',
    featured: false,
    caseStudy: {
      title: 'TranscriptWise: study materials with the source kept visible',
      problem:
        'Educational videos contain structured knowledge that dies in the timeline. TranscriptWise was designed to turn supported transcript inputs into organised study materials — guides, explanations, quizzes, flashcards — while separating transcript retrieval from AI analysis, citing source segments where possible, and distinguishing transcript-derived claims from AI-generated interpretation.',
      users: [
        'Learners studying from video content',
        'Educators preparing supplementary materials',
        'Self-learners building revision libraries',
      ],
      constraints: [
        'Transcript retrieval separated from AI analysis',
        'Source segments cited where possible; AI interpretation labelled',
        'Structured output validated (Pydantic); provider limits explained',
        'Long inputs managed without silent truncation',
      ],
      solution:
        'TranscriptWise accepts transcripts via YouTube URL (where supported), manual entry, or TXT/SRT/VTT upload, and presents them for review before any analysis. The analysis layer (configurable AI provider) generates study guides, concept explanations, actionable steps, quizzes, and flashcards — each carrying source-segment references where possible and a label on AI-generated interpretation. Materials save to a searchable library with export.',
      workflow: [
        {
          step: 'Retrieve',
          description:
            'Transcript input (URL/manual/upload) lands in a review step; retrieval issues are surfaced before analysis.',
        },
        {
          step: 'Analyse',
          description:
            'The AI layer produces structured materials; outputs validate against schemas and cite source segments where available.',
        },
        {
          step: 'Study',
          description:
            'Materials save to the library with search and export; timestamps link back to source segments where available.',
        },
      ],
      architecture:
        'Python/FastAPI backend with a retrieval module (separated), a provider-adapter boundary for AI analysis, Pydantic-validated structured outputs, PostgreSQL storage, and a React/TypeScript UI with Tailwind. Long-document handling chunks inputs with explicit coverage reporting.',
      dataModel:
        'Transcripts (source, segments) → Materials (kind: guide/explanation/quiz/flashcards, source refs, AI label) → Library → Exports.',
      engineeringDecisions: [
        {
          decision: 'Retrieval and analysis as separate modules',
          rationale:
            'The brief’s separation rule: a retrieval failure must not masquerade as an analysis result.',
        },
        {
          decision: 'Schema-validated AI output with source references',
          rationale:
            'Unvalidated generated content is unusable for study; structured validation and citations make it reviewable.',
        },
      ],
      testing:
        'Retrieval-module tests with recorded fixtures (including failure modes), structured-output validation tests, long-input chunking and coverage tests, and labelling tests asserting AI interpretation is marked. Provider behaviour tests run against a deterministic adapter fixture.',
      securityPrivacy:
        'Transcripts and study libraries are personal learning data, access-scoped; AI provider interactions are documented (what is sent, where); provider limits are explained in-product.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'AI-generated content requires human review and can be wrong',
        'Retrieval support depends on the configured provider/URL availability',
        'Not publicly deployed',
      ],
      futureImprovements: [
        'Additional source platforms where transcripts are supported',
        'Spaced-review integration for saved flashcards',
      ],
    },
  },
  {
    slug: 'learnbridge',
    name: 'LearnBridge',
    companySlug: 'tamuzi-learning',
    category: 'Education Technology',
    categories: ['Education Technology', 'Learning and Accessibility'],
    purpose:
      'Delivers structured digital courses that remain usable during unreliable connectivity.',
    summary:
      'An offline-first e-learning platform: course catalogue, lessons and modules, downloadable lesson packs, offline progress with sync and conflict handling, quizzes, bookmarks and notes, and course versioning.',
    status: 'BUILT',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'Python', 'FastAPI', 'PostgreSQL', 'IndexedDB', 'Service worker'],
    features: [
      {
        title: 'Offline-first lesson delivery',
        description:
          'Downloadable lesson packs and service-worker caching keep courses usable offline.',
      },
      {
        title: 'Sync with conflict handling',
        description:
          'Offline progress synchronises with idempotent, conflict-aware resolution.',
      },
      {
        title: 'Course versioning and roles',
        description:
          'Learner/instructor/admin roles and versioned courses keep content honest as it evolves.',
      },
    ],
    keywords: ['e-learning', 'offline-first', 'sync', 'service worker', 'courses'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Offline limitations are reported accurately in-product.',
    featured: false,
    caseStudy: {
      title: 'LearnBridge: courses that survive the connection dropping',
      problem:
        'For many learners the internet is intermittent — and an LMS that stops at the login screen fails exactly when it is needed. LearnBridge was designed offline-first: structured courses with downloadable lesson packs, offline progress capture, sync queues with idempotency and conflict resolution, and accurate reporting of what offline mode can and cannot do.',
      users: [
        'Learners on unreliable connections',
        'Programmes delivering blended/distance courses',
        'Instructors managing course versions',
      ],
      constraints: [
        'Offline is the primary mode, not a fallback',
        'Sync must be idempotent and resolve conflicts transparently',
        'Offline limitations reported accurately — no silent data loss',
      ],
      solution:
        'LearnBridge packages courses into lessons and modules with downloadable packs cached through IndexedDB and a service worker. Learner progress (quizzes, bookmarks, notes) records offline into a sync queue; synchronisation with the FastAPI/PostgreSQL backend is idempotent and surfaces conflicts for transparent resolution. Course versioning keeps material consistent across learners; roles separate learner, instructor, and admin concerns.',
      workflow: [
        {
          step: 'Download',
          description:
            'Learners fetch lesson packs when connected; the app states what is available offline.',
        },
        {
          step: 'Learn offline',
          description:
            'Lessons, quizzes, and notes work from cache; progress queues locally.',
        },
        {
          step: 'Sync',
          description:
            'Queued progress reconciles with the server idempotently; conflicts are shown and resolved, never silently dropped.',
        },
      ],
      architecture:
        'React/TypeScript frontend (Next.js or Vite) with an offline layer (IndexedDB, service worker, sync queue) over a Python/FastAPI backend with PostgreSQL and optional S3-compatible storage for packs. Sync protocol is idempotent by operation id; conflict handling is explicit.',
      dataModel:
        'Courses (versions) → Modules → Lessons (pack refs) → LocalProgress (queued ops) → ServerProgress (reconciled) → Conflicts (resolved records).',
      engineeringDecisions: [
        {
          decision: 'Idempotent operation-id sync protocol',
          rationale:
            'Retries over flaky connections are guaranteed; operations that can double-apply will corrupt progress.',
        },
        {
          decision: 'Conflicts surfaced, not auto-merged',
          rationale:
            'The brief’s honest-reporting rule: silent merges hide data loss; visible resolution keeps the learner’s record trustworthy.',
        },
      ],
      testing:
        'Sync-queue tests under simulated disconnection and retry, idempotency proofs for repeated operations, conflict-generation and resolution tests, pack-download integrity checks, and offline-availability state tests. No real-network field claims are made.',
      securityPrivacy:
        'Learner progress is personal data synced over authenticated channels; local caches are documented; accounts are role-scoped.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Offline depth bounded by downloaded packs',
        'Real-network performance under field conditions unverified',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Peer-to-peer pack sharing for classroom distribution',
        'Richer conflict previews',
      ],
    },
  },
  {
    slug: 'classconnect',
    name: 'ClassConnect',
    companySlug: 'tamuzi-learning',
    category: 'Education Technology',
    categories: ['Education Technology', 'Learning and Accessibility'],
    purpose:
      'Supports scheduled remote lessons and asynchronous follow-up for teachers and learners with different connectivity constraints.',
    summary:
      'A low-bandwidth virtual classroom: class scheduling, enrolment, live sessions through a configured WebRTC provider, audio-priority mode, chat and question queue, polls, attendance, materials, and asynchronous follow-up.',
    status: 'BUILT',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed. Live calls require a configured WebRTC provider (e.g. LiveKit); demo mode is simulated and labelled.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Python', 'FastAPI', 'PostgreSQL', 'Redis', 'LiveKit (configured)'],
    features: [
      {
        title: 'Low-bandwidth session design',
        description:
          'Video-off/audio-priority mode where supported; the classroom works on constrained connections.',
      },
      {
        title: 'Live and asynchronous together',
        description:
          'Question queue, polls, chat, and asynchronous follow-up keep learning moving when live is not possible.',
      },
      {
        title: 'Room-token authorization',
        description:
          'Sessions are access-controlled with explicit permission checks — demo mode is clearly simulated.',
      },
    ],
    keywords: ['virtual classroom', 'webrtc', 'low bandwidth', 'scheduling', 'async learning'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Demo mode is simulated; real calls require a configured WebRTC provider. The distinction is labelled in-product.',
    featured: false,
    caseStudy: {
      title: 'ClassConnect: remote lessons shaped by real connections',
      problem:
        'Video classrooms assume bandwidth that many teachers and learners do not have. ClassConnect was designed for scheduled remote lessons under connectivity constraints: audio-priority modes, a question queue and polls that work alongside weak video, attendance and materials, and asynchronous follow-up — integrated with an established WebRTC service through room-token authorization, and honest about the line between simulated demo mode and a real call.',
      users: [
        'Teachers running remote or blended classes on constrained connections',
        'Learners joining from shared or low-bandwidth devices',
        'Programmes needing asynchronous fallback',
      ],
      constraints: [
        'Live media through a configured WebRTC provider only — never home-grown media servers',
        'Demo mode must be visibly simulated, never presented as a real call',
        'Consent-controlled recording where implemented',
        'Connection recovery and async fallback are core, not extras',
      ],
      solution:
        'ClassConnect schedules classes and enrolments, then runs live sessions through a configured WebRTC provider (e.g. LiveKit) with room-token authorization per participant. The session interface supports audio-priority/video-off modes, chat, a question queue, and polls that degrade gracefully. Attendance records participation facts; materials and assignments continue asynchronously after the session. Where no provider is configured, a clearly-labelled simulated demo mode demonstrates the workflow.',
      workflow: [
        {
          step: 'Schedule',
          description: 'Classes are scheduled with enrolments and materials attached.',
        },
        {
          step: 'Meet',
          description:
            'Live sessions connect through provider room tokens; participants can drop video and continue by audio.',
        },
        {
          step: 'Continue',
          description:
            'Question queue, polls, materials, and assignments carry the class asynchronously; attendance records the facts.',
        },
      ],
      architecture:
        'React/TypeScript frontend with a FastAPI/PostgreSQL backend; Redis supports session state; a WebRTC-provider adapter issues room tokens server-side; async follow-up services handle queues and materials. The demo-mode simulator is a separate, labelled code path.',
      dataModel:
        'Classes (schedule) → Enrolments → Sessions (provider refs, mode) → Attendance (facts) → Queues/Polls → Materials/Assignments.',
      engineeringDecisions: [
        {
          decision: 'Provider adapter with server-side room tokens',
          rationale:
            'Room access is authorization, not a UI concern; tokens mint server-side keep sessions closed to unauthorised joiners.',
        },
        {
          decision: 'Simulator is a separate labelled code path',
          rationale:
            'The brief’s demo-vs-real rule: simulated sessions must never be mistakable for live calls.',
        },
      ],
      testing:
        'Scheduling and enrolment tests, room-token authorization tests (denied paths asserted), degraded-mode behaviour tests (audio-priority, async fallback), queue/poll workflow tests, and demo-mode labelling tests. Live media quality is a provider matter and is not tested here.',
      securityPrivacy:
        'Sessions are access-controlled via room tokens; consent-controlled recording where implemented; attendance data is minimal participation facts.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Live media quality depends on the configured WebRTC provider',
        'Demo mode is simulated and labelled as such',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Recording review with consent workflow',
        'Additional provider adapters',
      ],
    },
  },
  {
    slug: 'tutorspring',
    name: 'TutorSpring',
    companySlug: 'tamuzi-learning',
    category: 'AI and Intelligent Applications',
    categories: ['AI and Intelligent Applications', 'Education Technology'],
    purpose:
      'Provides grounded, supportive tutoring that helps learners understand concepts, practice, and seek teacher support when needed.',
    summary:
      'An AI learning companion with Explain, Hint, Practice, Check Reasoning, and Summarize modes — grounded in approved sources with citations, adaptive explanation levels, a teacher review queue, and a deterministic demo mode.',
    status: 'BUILT',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed. AI correctness and learning mastery are not claimed.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Python', 'FastAPI', 'Pydantic', 'PostgreSQL', 'Model-provider adapter'],
    features: [
      {
        title: 'Grounded tutoring modes',
        description:
          'Explain, Hint, Practice, Check Reasoning, and Summarize — each grounded in approved-source retrieval with citations.',
      },
      {
        title: 'Adaptive explanation level',
        description:
          'Explanation depth adapts to the learner; language options where configured.',
      },
      {
        title: 'Teacher review queue',
        description:
          'Teacher-visible review of tutoring interactions; a deterministic demo mode demonstrates flows without a live model.',
      },
    ],
    keywords: ['AI tutoring', 'retrieval', 'citations', 'education', 'learning companion'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. AI answers can be wrong; correctness and mastery are not claimed. Deterministic demo mode is labelled.',
    featured: false,
    caseStudy: {
      title: 'TutorSpring: tutoring that shows its sources and its uncertainty',
      problem:
        'AI tutoring fails learners most when it is confident, unsourced, and closed off from teachers. TutorSpring was designed as a grounded learning companion: purposeful modes (Explain, Hint, Practice, Check Reasoning, Summarize), answers retrieved from approved sources with citations, adaptive explanation depth, a teacher review queue, and a deterministic demo mode — with prompt-injection resilience, rate limits, and privacy treated as core pedagogy-adjacent requirements.',
      users: [
        'Learners seeking structured tutoring support',
        'Teachers overseeing AI-assisted learning',
        'Programmes piloting AI tutoring carefully',
      ],
      constraints: [
        'Retrieval-grounded answers only; citations validated against sources',
        'No AI-correctness or mastery claims without evidence',
        'Prompt-injection resilience over retrieved content',
        'Privacy and rate limits on learner interactions',
      ],
      solution:
        'TutorSpring routes each learner request to a mode (Explain, Hint, Practice, Check Reasoning, Summarize). Responses are grounded through approved-source retrieval with citation validation; explanation level adapts to the learner; unsupported content is flagged rather than answered. A teacher review queue surfaces interactions for human oversight. A deterministic demo mode (labelled) demonstrates the full flow without a live model provider.',
      workflow: [
        {
          step: 'Ask',
          description:
            'Learners choose a mode and ask; requests are rate-limited and privacy-scoped.',
        },
        {
          step: 'Ground',
          description:
            'Approved-source retrieval builds context; retrieved content is sanitised against prompt injection.',
        },
        {
          step: 'Respond',
          description:
            'The answer cites its sources, states uncertainty, and adapts its explanation level.',
        },
        {
          step: 'Review',
          description:
            'Teachers see the review queue; escalation to human support is one action away.',
        },
      ],
      architecture:
        'React/TypeScript frontend with a FastAPI backend; a model-provider adapter boundary supports configurable providers; retrieval over approved sources uses PostgreSQL full-text search with optional pgvector; Pydantic validates structured outputs; a deterministic adapter provides demo mode.',
      dataModel:
        'Sources (approved corpora) → Retrievals (query, context) → Interactions (mode, question, answer, citations) → ReviewQueue (teacher state) → LearnerSettings (level, language).',
      engineeringDecisions: [
        {
          decision: 'Citation validation after generation',
          rationale:
            'Citations that do not resolve to retrieved sources are hallucination; validating them is the grounding guarantee.',
        },
        {
          decision: 'Deterministic demo adapter as a first-class provider',
          rationale:
            'Evaluators and classrooms need the flow without live-model cost, variability, or privacy exposure — clearly labelled as demo.',
        },
      ],
      testing:
        'Mode-routing tests, retrieval fixture tests, citation-validation tests (invalid citations rejected), prompt-injection resilience tests over retrieved content, rate-limit tests, and deterministic demo-mode reproducibility. AI answer correctness is not tested or claimed.',
      securityPrivacy:
        'Learner interactions are sensitive educational data; access is scoped to learner and reviewing teacher; rate limits and minimisation apply; provider data handling is documented.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'AI answers can be wrong; no correctness or mastery claims',
        'Grounding quality bounded by approved-source coverage',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Additional language packs where providers support them',
        'Teacher-authored source packs',
      ],
    },
  },
];
