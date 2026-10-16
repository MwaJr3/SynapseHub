import type { PortfolioProject } from '@/types';

export const teachcraft: PortfolioProject = {
  id: 'project-05-teachcraft',
  slug: 'teachcraft',
  name: 'TeachCraft',
  shortDescription:
    'A content and assessment studio where educators author lessons, question banks and workshops, review them with colleagues, and publish versioned material.',
  longDescription:
    'TeachCraft is built on a structured content model rather than rich text blobs: lessons are ordered blocks, questions belong to banks, and rubrics are reusable. Draft, review, publish and archive are explicit states with history, so a published lesson is a version, not a document that someone quietly edited.',
  primaryCategory: 'Education Technology / Teacher Tools / Content Authoring',
  categories: ['teacher-tools', 'open-resources', 'full-stack', 'python'],
  technologies: [
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Python',
    'FastAPI',
    'Pydantic',
    'PostgreSQL',
    'TipTap (structured editor)',
    'Background export jobs',
  ],
  featureTags: [
    'Structured lesson blocks',
    'Review workflow',
    'Version history',
    'Question banks',
    'Export adapters',
  ],
  features: [
    {
      title: 'Structured lesson authoring',
      description:
        'Lessons are built from typed blocks — headings, text, lists, tables, links, images with alt text, workable examples and maths where supported — validated before they can be saved.',
      importance:
        'Structure is what makes content reusable, exportable and accessible instead of merely formatted.',
    },
    {
      title: 'Learning objectives and templates',
      description:
        'Units attach learning objectives, and reusable templates cover lesson plans, short lessons, worked examples, revision sheets, quizzes and assignment briefs.',
      importance:
        'Teachers rebuild the same shapes constantly; templates turn that effort into consistency.',
    },
    {
      title: 'Question banks and assessment building',
      description:
        'Single choice, multiple choice, true/false, numeric, ordering, matching and rubric-scored short answer questions in shared banks, assembled into quizzes and assignments.',
      importance:
        'A reusable bank is what makes assessment maintenance tolerable across terms.',
    },
    {
      title: 'Learner-facing previews',
      description:
        'Desktop and mobile previews render the actual learner view before anything is published.',
      importance:
        'Most layout and accessibility problems are visible in two seconds of preview and invisible in the editor.',
    },
    {
      title: 'Draft, review, publish, archive',
      description:
        'Transitions are permissioned and recorded, with reviewer comments, change summaries and the ability to restore a previous version.',
      importance:
        'Shared material needs an owner and a decision point, otherwise edits become unattributable.',
    },
    {
      title: 'Autosave with rollback',
      description:
        'Edits autosave with a visible status, and optimistic updates roll back cleanly with the server\u2019s validation message when a save is rejected.',
      importance:
        'Authoring tools lose trust the first time work disappears, and teachers do not come back.',
    },
    {
      title: 'Reusable, searchable content',
      description:
        'Duplication, tagging, search and filtering by subject, level, language, objective, estimated time and licence.',
      importance:
        'Reuse is how a department stops maintaining five near-identical worksheets.',
    },
    {
      title: 'Export adapters with stated limits',
      description:
        'PDF and HTML exports are static; interactive question behaviour is documented per format rather than assumed, and each adapter reports what it can and cannot preserve.',
      importance:
        'An export that silently drops an interactive question misleads the teacher who hands it out.',
    },
  ],
  visualLabel: 'Illustrative lesson-authoring and review-workflow preview',
  previews: [
    {
      id: 'teachcraft-primary',
      view: 'primary',
      alt: 'Illustrative preview of a lesson editor showing structured blocks and autosave status.',
      caption:
        'Lesson editor: ordered blocks, objective links and autosave status.',
      isIllustrative: true,
    },
    {
      id: 'teachcraft-detail',
      view: 'detail',
      alt: 'Illustrative preview of a review queue with reviewer comments and a version history list.',
      caption:
        'Review queue with comments, change summaries and restorable versions.',
      isIllustrative: true,
    },
  ],
  architecture: [
    {
      id: 'client',
      label: 'React + TypeScript client',
      layer: 'client',
      description:
        'Workspace dashboard, block editor, preview modes, review queue and export centre.',
      connectsTo: ['api'],
    },
    {
      id: 'editor',
      label: 'TipTap editor layer',
      layer: 'client',
      description:
        'Schema-constrained editing with sanitisation and block-level validation.',
      connectsTo: ['api'],
    },
    {
      id: 'api',
      label: 'FastAPI service',
      layer: 'api',
      description:
        'Content CRUD, workflow transitions, permissions, autosave and export requests.',
      connectsTo: ['content-model'],
    },
    {
      id: 'content-model',
      label: 'Content model and validation',
      layer: 'domain',
      description:
        'Pydantic block schemas, publishability rules and version snapshots.',
      connectsTo: ['database'],
    },
    {
      id: 'workflow',
      label: 'Workflow engine',
      layer: 'domain',
      description:
        'Draft, review, publish and archive transitions with permissions and audit events.',
      connectsTo: ['database'],
    },
    {
      id: 'exports',
      label: 'Export adapters',
      layer: 'integration',
      description:
        'PDF and HTML renderers with documented fidelity limits per format.',
      connectsTo: ['worker'],
    },
    {
      id: 'worker',
      label: 'Background worker',
      layer: 'worker',
      description:
        'Long-running exports, media processing and notification jobs.',
      connectsTo: ['database'],
    },
    {
      id: 'database',
      label: 'PostgreSQL',
      layer: 'data',
      description:
        'Content, blocks, objectives, question banks, versions, comments, exports and audit events.',
    },
  ],
  caseStudy: {
    problem:
      'Educators create and maintain teaching material across word processors, slide decks, messaging apps and paper. Nothing is versioned, review is informal, and reusable questions live in one teacher\u2019s folder. When material is finally digitised it often loses its structure, so it cannot be reused, searched or exported reliably.',
    users: [
      'Teachers authoring lessons, quizzes and assignments',
      'Curriculum coordinators maintaining shared units',
      'Reviewers approving material before it reaches learners',
      'Tutors and content teams adapting existing material',
    ],
    constraints: [
      'Editors must never produce invalid content: a half-written block cannot be published.',
      'Export formats differ in what they can preserve; the difference must be documented.',
      'Permissions decide who may publish or export restricted material, and must be enforced server-side.',
      'Optional AI drafting cannot be allowed to publish unreviewed material.',
    ],
    workflow: [
      {
        title: 'Draft',
        description:
          'Create a course, unit or lesson from a template, or duplicate existing material to adapt it.',
      },
      {
        title: 'Structure and preview',
        description:
          'Add typed blocks, attach objectives and check the learner-facing desktop and mobile previews.',
      },
      {
        title: 'Submit for review',
        description:
          'Hand the draft to a reviewer with a change summary; comments stay attached to the version they discuss.',
      },
      {
        title: 'Publish a version',
        description:
          'Publishing freezes an immutable version and records who approved it.',
      },
      {
        title: 'Export',
        description:
          'Export to a supported format and see exactly what the format preserves.',
      },
      {
        title: 'Reuse or archive',
        description:
          'Duplicate for another term, tag for discovery, or archive without destroying prior results.',
      },
    ],
    engineeringDecisions: [
      {
        title: 'A schema-driven content model',
        description:
          'Blocks are typed data validated by Pydantic on the server and by the editor schema on the client, so invalid structure is rejected at both ends instead of producing unrenderable lessons.',
      },
      {
        title: 'Sanitised rich text',
        description:
          'Inline formatting is allowlisted and pasted content is cleaned before storage, which keeps stored HTML safe to render and predictable to export.',
      },
      {
        title: 'Debounced autosave with optimistic rollback',
        description:
          'Edits apply immediately in the UI, save on a debounce, and revert to the last confirmed version with a visible reason when the server rejects them.',
      },
      {
        title: 'Published versions are immutable',
        description:
          'Publishing writes a snapshot; editing a published lesson creates a new working version. Restoring an older version is a new version pointing at the old content, so history is never rewritten.',
      },
      {
        title: 'Export fidelity is declared per adapter',
        description:
          'Each exporter declares which block types and interactions it preserves, and the export centre surfaces that before the teacher shares the file.',
      },
      {
        title: 'AI drafting is a gated convenience',
        description:
          'When an AI drafting provider is configured, output arrives as an unapproved draft attributed as AI-assisted, and human review remains mandatory before publication. No provider keys reach the browser.',
      },
    ],
    testing: [
      'Block validation, including rejection of malformed or unsupported structures.',
      'Autosave behaviour and rollback when the server rejects an update.',
      'Workflow permissions: who can submit, review, publish, archive or export.',
      'Version history and restore, including that publishing does not mutate prior versions.',
      'Export output for each adapter, and that declared fidelity matches what is produced.',
      'Sanitisation of pasted rich text and image alt-text requirements.',
    ],
    limitations: [
      'Exports are static formats: PDF and HTML exports do not preserve interactive question behaviour, and the interface says so rather than implying otherwise.',
      'Collaboration is review-based rather than simultaneous co-editing; there is no operational-transform or CRDT layer, so two authors editing one lesson conflict on save.',
      'Maths and media support depend on the configured editor extensions and renderer.',
      'Standards-based question package export (for example QTI) is not implemented.',
      'AI-assisted drafting is optional, provider-dependent and never publishes without review.',
    ],
    futureImprovements: [
      'Simultaneous co-editing with conflict-free replicated data types.',
      'Standards-based question export with an interchange test against another platform.',
      'Accessibility linting inside the editor, warning about contrast, alt text and heading order before publish.',
      'Department-level content analytics showing which resources are reused and which are stale.',
    ],
  },
  featured: false,
  status: 'completed',
  displayOrder: 5,
  relatedSlugs: ['classconnect', 'tutorspring', 'openlearn-commons'],
  demoRequirements:
    'Runs with seeded demonstration content. Optional AI drafting requires a configured provider key held server-side; exports use local rendering with no external service.',
};
