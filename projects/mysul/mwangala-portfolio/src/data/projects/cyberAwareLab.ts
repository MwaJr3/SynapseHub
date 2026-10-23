import type { Project } from '@/types/project';
import { projectLinks } from '@/config/projectLinks';

const links = projectLinks('cyberaware-lab');

export const cyberAwareLab: Project = {
  id: 'prj-cyberaware-lab',
  slug: 'cyberaware-lab',
  name: 'CyberAware Lab',
  tagline: 'Learn to recognize risks. Practice making safer decisions.',
  summary:
    'An interactive cybersecurity awareness platform that teaches risk recognition through structured lessons, clearly fictional simulations, quizzes and honest progress tracking.',
  description: [
    'CyberAware Lab helps learners understand common digital-security risks through structured lessons, safe simulations, quizzes and progress tracking. It turns abstract security concepts into decisions a person can practise making.',
    'The simulations are explicitly fictional. Emails and messages used in exercises carry invented organisations, invented senders and a visible simulation banner. The platform never impersonates a real organisation, never collects real passwords, and never sends messages to anyone.',
    'Progress tracking is deliberately modest: it records lessons completed, quiz results, incorrect answers and topics that need revision. It does not claim mastery, because completing a lesson is evidence of exposure, not of competence.',
  ],
  categories: ['Cybersecurity Education', 'Learning Technology', 'Full-Stack Engineering'],
  filters: ['education', 'cybersecurity', 'full-stack'],
  tech: [
    'Python',
    'FastAPI',
    'Pydantic',
    'SQLAlchemy',
    'Alembic',
    'PostgreSQL',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Role-based access',
    'pytest',
  ],
  keyTech: ['Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL'],
  featured: false,
  order: 8,
  status: 'Complete — lessons, scenarios, quizzes, progress and instructor tooling',
  year: '2025',
  role: 'Learning model design, assessment logic, content structure, frontend',
  accent: 'green',
  capabilities: [
    'Safe, clearly labelled fictional simulations with reasoning-based feedback',
    'Learner and instructor roles with progress reporting grounded in recorded results',
  ],
  features: [
    {
      title: 'Structured learning modules',
      body: 'Phishing recognition, password security, multifactor authentication, social engineering, safe browsing, suspicious attachments, account recovery and basic incident reporting. Modules are sequenced into learning paths by difficulty.',
    },
    {
      title: 'Fictional scenario simulations',
      body: 'Simulated emails, messages and prompts built from invented organisations and senders, each carrying a persistent simulation banner. Learners identify warning signs and choose a defensive response.',
    },
    {
      title: 'Reasoning-based feedback',
      body: 'Every answer — correct or not — explains why. Incorrect answers name the specific signal that was missed rather than simply marking the response wrong, because the transferable skill is noticing, not scoring.',
    },
    {
      title: 'Quizzes generated from approved content',
      body: 'Questions are authored against lesson content and tagged by topic and difficulty. Quizzes mix recall, recognition and scenario-judgement items, and are graded server-side so answers are never exposed to the client.',
    },
    {
      title: 'Progress tracking and revision suggestions',
      body: 'Completed lessons, quiz attempts, per-topic accuracy and a revision queue built from incorrectly answered topics. Progress is presented as activity, with mastery claims explicitly avoided.',
    },
    {
      title: 'Instructor and administrator tools',
      body: 'Create and edit lessons, scenarios and questions; organise modules into learning paths; view cohort completion, aggregate quiz performance and the topics where learners struggle most.',
    },
    {
      title: 'Role-based access',
      body: 'Learners see their own progress only. Instructors see aggregate and per-learner results for cohorts they manage. Administrators manage content and roles. Access is enforced server-side on every route.',
    },
    {
      title: 'Completion reporting',
      body: 'Per-learner completion reports and cohort summaries with aggregate performance and topic-level weakness analysis, exportable for training records.',
    },
  ],
  demonstrates: [
    'Educational application design and learning-flow modelling',
    'Assessment and grading logic implemented server-side',
    'User progress persistence and revision recommendations',
    'Role-based access control across learner and instructor views',
    'Data-driven dashboards that avoid overclaiming',
    'Translating technical security concepts into accessible experiences',
  ],
  caseStudyFocus:
    'How security concepts become learning modules and decision-making exercises — the assessment model, progress tracking, feedback design, and the choices that help learners understand why an answer is correct.',
  visualDirection:
    'Polished learning platform: lesson cards, progress information, scenario screens, quizzes, recommendations. Engaging but not childish, with readability and accessibility prioritised for long sessions.',
  preview: {
    visual: 'cyberaware-lab',
    alt: 'Representative CyberAware Lab preview: a lesson progress card, a fictional phishing scenario with a simulation banner, and answer feedback explaining the warning signs.',
    screenshotNote:
      'Hand-drawn representative preview built from the implemented feature set, not a screenshot of a deployed instance. Set preview.screenshot to replace it.',
  },
  liveUrl: links.live,
  repoUrl: links.repo,
  needsAuthorReview: [
    'challenges — confirm the wording matches your own implementation history',
    'demonstration — replace with real lesson content you have authored',
  ],
  caseStudy: {
    problem: [
      'Security awareness training usually fails in one of two ways. It is a compliance slideshow that people click through and forget, or it is a simulated phishing campaign that catches people out and teaches them to distrust their own colleagues.',
      'Neither produces the skill that matters: noticing that a message asking for an urgent payment has a reply-to address that does not match the sender, and knowing what to do next.',
      'There is also a measurement problem. "Completed the training" is recorded as though it meant "can recognise a phishing email", and nobody can tell the difference afterwards.',
    ],
    whoBenefits: [
      'Cybersecurity students building practical awareness alongside theory',
      'University clubs and study groups running structured sessions',
      'Small businesses and IT teams needing awareness training without a compliance platform',
      'Individuals who want to understand the risks they actually face',
    ],
    objectives: [
      'Teach recognition through practise rather than through reading.',
      'Give feedback that explains reasoning, so a wrong answer is a learning event.',
      'Keep every simulation clearly fictional and harmless — no real credentials, no real impersonation, no outbound messages.',
      'Track progress honestly, distinguishing activity from demonstrated understanding.',
      'Let an instructor manage content and see cohort-level weaknesses without exposing learners to each other.',
    ],
    solution: [
      'Content, assessment and progress are three separate modules with a clear contract between them.',
      'Content is a tree: LearningPath → Module → Lesson, with lessons containing blocks of prose plus embedded Scenario and Question items. Content is authored and edited by instructors through the API, stored as structured data rather than raw HTML, and rendered by the frontend — so learner-facing text is never interpreted as markup.',
      'Assessment is server-side. A quiz attempt posts answers to the server, which grades them against stored correct answers and returns per-item feedback including the explanation and the specific signal that the item was testing. Correct answers and scoring data are never sent to the client, so a learner cannot read the answers out of the bundle.',
      'Progress is a set of append-only attempt records plus derived state: lessons completed, quiz scores, per-topic accuracy, and a revision queue ranked by weakest topic. The dashboard reports activity ("3 lessons completed, 78% average on password security") and never infers mastery. Scenarios record the choices made and the reasoning given, which is what makes the topic-level weakness analysis possible.',
    ],
    workflow: {
      title: 'Learner journey',
      steps: [
        { label: 'Enrol', detail: 'Assigned or self-selected learning path' },
        { label: 'Learn', detail: 'Lesson blocks with embedded scenarios' },
        { label: 'Practise', detail: 'Identify warning signs, choose a response' },
        { label: 'Feedback', detail: 'Explanation of why, per item' },
        { label: 'Assess', detail: 'Server-graded quiz with topic tagging' },
        { label: 'Revise', detail: 'Queue built from weakest topics' },
        { label: 'Review', detail: 'Learner history and instructor reports' },
      ],
      caption:
        'Every simulation screen carries a persistent "fictional scenario" banner that cannot be dismissed by the learner.',
    },
    architecture: {
      summary:
        'FastAPI backend with structured content storage and server-side grading; PostgreSQL for progress records; React frontend for lessons, scenarios and dashboards.',
      layers: [
        {
          layer: 'Content model',
          items: [
            'Learning paths, modules, lessons, blocks, scenarios and questions',
            'Structured content rather than raw HTML — rendered safely by the client',
            'Topic and difficulty tags used by quizzes and revision logic',
            'Instructor CRUD with draft/published states',
          ],
        },
        {
          layer: 'Assessment engine',
          items: [
            'Server-side grading against stored answer keys',
            'Per-item feedback with explanation and tested signal',
            'Attempt records that are append-only',
            'Answer keys never transmitted to the client',
          ],
        },
        {
          layer: 'Progress & reporting',
          items: [
            'Derived completion, accuracy and revision-queue state',
            'Cohort aggregation for instructor views',
            'Completion report generation',
            'Explicit separation of activity from mastery',
          ],
        },
        {
          layer: 'Access control & frontend',
          items: [
            'Learner, instructor and administrator roles enforced per route',
            'Learners scoped to their own records; instructors to their cohorts',
            'Lesson reader, scenario screen, quiz runner, dashboards',
            'Accessible, responsive layout for long reading sessions',
          ],
        },
      ],
      security: [
        'Simulations collect no real credentials; password examples are invented and rejected if they look like real submissions.',
        'No outbound messaging of any kind — the platform cannot send email or messages to real recipients.',
        'Learner-facing content is stored as structured data and rendered by React, so authored text is never executed as HTML.',
        'Answer keys and scoring data stay server-side.',
        'Individual results are visible only to the learner and to instructors of their cohort.',
      ],
    },
    decisions: [
      {
        title: 'Grading happens on the server',
        context:
          'Client-side grading is simpler: the quiz component holds the correct answers and scores locally.',
        decision:
          'Attempts are posted to the server, graded there, and returned with feedback. The client never receives answer keys.',
        tradeoff:
          'A network round-trip per submission and more API surface. It keeps answers out of the shipped bundle, makes attempts auditable, and allows questions to be reused across quizzes without leaking them.',
      },
      {
        title: 'Progress reports activity, not mastery',
        context:
          'A progress bar and a "mastered" badge are motivating and easy to compute from completion counts.',
        decision:
          'The model records completion and per-topic accuracy separately, and the UI reports both without converting either into a mastery claim. Revision recommendations come from accuracy, not from completion.',
        tradeoff:
          'Less gamified, and a learner who completes everything still sees topics flagged for revision. It keeps the training record honest — a completion certificate that implies competence would be misleading.',
      },
      {
        title: 'Structured content instead of raw HTML',
        context:
          'Letting instructors write HTML gives maximum flexibility for lesson layout.',
        decision:
          'Lesson content is stored as typed blocks (paragraph, list, callout, scenario, question) and rendered by components. Simulated emails use a dedicated component with a fixed banner and invented-sender fields.',
        tradeoff:
          'Instructors cannot insert arbitrary markup, and new layout ideas need a new block type. It removes a stored-XSS path from an authoring feature, guarantees the simulation banner is always present, and keeps content portable for export.',
      },
    ],
    testing: {
      summary:
        'Tests verify grading correctness, progress derivation, access control and report accuracy — the behaviours a training record depends on.',
      items: [
        {
          title: 'Grading tests',
          body: 'Correct, incorrect and partially correct answers across item types; multi-select ordering; unanswered items; an attempt submitted twice; feedback content per item.',
        },
        {
          title: 'Progress derivation tests',
          body: 'Completion state from lesson attempts, per-topic accuracy from tagged questions, and revision-queue ordering after a retake improves a topic score.',
        },
        {
          title: 'Access control tests',
          body: 'A learner cannot read another learner\'s results; an instructor sees only their cohort; content editing requires instructor or administrator role; every sensitive route is tested individually.',
        },
        {
          title: 'Report tests',
          body: 'Cohort completion percentages, aggregate quiz performance and topic weakness lists match hand-computed values from a seeded dataset.',
        },
        {
          title: 'Content-safety tests',
          body: 'Authored text containing markup or script is rendered inert; scenario components always include the simulation banner; password-style inputs in exercises are rejected and never stored.',
        },
      ],
    },
    challenges: [
      {
        problem:
          'Realistic phishing scenarios are more effective the more real they feel — and that is precisely what makes them risky. A learner who momentarily believes a simulated email is from their bank has been deceived by a training tool.',
        approach:
          'Every scenario uses invented organisations and senders, carries a persistent non-dismissible "fictional scenario" banner, and is introduced as a simulation before it is shown. Realistic tactics (urgency, authority, familiarity) are preserved; realistic identities are not.',
        reasoning:
          'The teaching value comes from the tactic, not from the brand. Deceiving your own learners damages trust in the training and, in a workplace, can be genuinely harmful.',
        lesson:
          'Ethical constraints in a simulation are a design input, not a compliance checkbox — and they usually do not cost as much educational value as you expect.',
      },
      {
        problem:
          'Feedback that only says "incorrect" teaches nothing, but feedback that explains everything can give away the answer pattern for the next question.',
        approach:
          'Feedback is authored per item and delivered after the attempt is graded, naming the specific signal the item tested and pointing back to the lesson block that covers it. Explanations reference the concept, not the answer.',
        reasoning:
          'Learners need to connect a mistake to a transferable check. Revealing the answer key helps only on a retake of the identical question.',
        lesson:
          'Good assessment feedback is content in its own right and has to be authored with the same care as the lesson.',
      },
      {
        problem:
          'Cohort analytics risk turning into surveillance, and per-learner results are sensitive.',
        approach:
          'Instructor views default to aggregate. Per-learner detail requires the instructor to be assigned to that cohort, is access-logged, and individual results are never exposed to other learners.',
        reasoning:
          'A learner who suspects their mistakes are visible to peers will answer conservatively and learn less. Aggregation by default keeps the analytics useful and the environment safe.',
        lesson:
          'Default to the least revealing view that still serves the purpose; make the detailed view deliberate.',
      },
    ],
    demonstration: {
      summary:
        'The platform ships with a starter learning path, sample lessons, scenarios and questions, clearly identified as demonstration content.',
      steps: [
        {
          title: 'Start a learning path',
          body: 'Open a module and work through lesson blocks with embedded scenarios.',
        },
        {
          title: 'Practise recognition',
          body: 'In a fictional scenario, identify the warning signs and choose a defensive response. Feedback explains the reasoning for every option.',
        },
        {
          title: 'Take a quiz',
          body: 'Answer topic-tagged questions. Grading happens server-side and each item returns an explanation.',
        },
        {
          title: 'Review progress',
          body: 'Check completed lessons, per-topic accuracy and the revision queue. Instructors see cohort completion and the weakest topics across the group.',
        },
      ],
      accessNote:
        'Demonstration learners and sample lesson content are labelled as demonstration data. Learner and instructor roles require an account created by an administrator; no demo credentials are published here.',
    },
    limitations: [
      'Awareness training is not a technical control. Completing a course does not make a system secure, and the reporting never implies that it does.',
      'Simulations are constrained to be safe and fictional, which limits realism compared with live phishing campaigns — a deliberate trade-off.',
      'Content quality depends on authored lessons and questions; the platform supplies structure and starter content, not an exhaustive curriculum.',
      'Assessment is closed-book recognition and judgement. It cannot measure behaviour under real pressure.',
      'No outbound messaging, so the platform cannot run organisation-wide simulated phishing campaigns by design.',
      'Accessibility of authored content depends on instructors using the provided block types correctly.',
    ],
  },
};
