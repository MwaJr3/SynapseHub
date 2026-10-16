import type { PortfolioProject } from '@/types';

export const openlearnCommons: PortfolioProject = {
  id: 'project-06-openlearn-commons',
  slug: 'openlearn-commons',
  name: 'OpenLearn Commons',
  shortDescription:
    'A catalogue and contribution platform for discovering, evaluating, localising and responsibly reusing open educational resources with visible licences and attribution.',
  longDescription:
    'OpenLearn Commons is a catalogue that refuses to hide its paperwork. Every resource shows its source, creator, licence and attribution text; adaptations and translations link back to what they came from; and reuse guidance is generated from the recorded licence metadata, including the honest case where the licence is unknown and reuse cannot be confirmed.',
  primaryCategory:
    'Education Technology / Open Educational Resources / Localization',
  categories: [
    'open-resources',
    'teacher-tools',
    'offline-first',
    'mobile-low-bandwidth',
    'full-stack',
    'python',
  ],
  technologies: [
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Python',
    'FastAPI',
    'Pydantic',
    'PostgreSQL',
    'PostgreSQL full-text search',
    'S3-compatible object storage',
    'Isolated source connectors',
  ],
  featureTags: [
    'Licence metadata',
    'Attribution',
    'Translation review',
    'Source connectors',
    'Offline suitability',
  ],
  features: [
    {
      title: 'A catalogue built for evaluation',
      description:
        'Search across lessons, readings, worksheets, audio, video, simulations and course packs with filters for subject, level, language, format, accessibility, duration and licence.',
      importance:
        'A teacher hunting for material needs to judge fit and reuse terms at the same time, not in two places.',
    },
    {
      title: 'Source, creator and attribution records',
      description:
        'Each resource stores canonical source, creator, licence, attribution text, import timestamp, language, version and review status, and renders them on the resource page.',
      importance:
        'Attribution is the obligation that keeps openly licensed material open for the next teacher.',
    },
    {
      title: 'Licence-aware reuse guidance',
      description:
        'Reuse guidance is derived from the recorded licence — whether adaptation, redistribution or commercial use is permitted — and states clearly when metadata is incomplete.',
      importance:
        'Publicly reachable is not the same as openly licensed, and the interface must not blur the two.',
    },
    {
      title: 'Adaptations linked to their sources',
      description:
        'Localised examples, reading-level variants and adaptations are first-class records that keep pointing at the source resource and its licence obligations.',
      importance:
        'Localisation is the most valuable contribution a teacher can make, and it also creates the most confusion about provenance.',
    },
    {
      title: 'Side-by-side translation review',
      description:
        'Source and target text sit next to each other with reviewer comments, approval status and revision history; machine translation is labelled a draft until a human approves it.',
      importance:
        'Unreviewed machine translation in a classroom is a comprehension hazard, not a shortcut.',
    },
    {
      title: 'Connectors with health status',
      description:
        'Approved public APIs and feeds are implemented as isolated connectors with documented rate limits, and source health is visible when an upstream service is unavailable.',
      importance:
        'Catalogue trust depends on knowing whether a resource is missing or the source is simply down.',
    },
    {
      title: 'Moderation, duplicates and takedown',
      description:
        'Duplicate detection, review queues, community ratings with moderation, and a takedown workflow with an audit trail.',
      importance:
        'Contribution platforms decay without a way to correct mistakes and honour removal requests.',
    },
    {
      title: 'Offline suitability, stated honestly',
      description:
        'Resources carry downloadability and offline-suitability indicators, and the catalogue distinguishes a locally hosted file from an external link that needs a connection.',
      importance:
        'A catalogue that implies offline availability it does not provide breaks the promise at the worst moment.',
    },
  ],
  visualLabel: 'Illustrative resource-catalogue and licence-metadata preview',
  previews: [
    {
      id: 'openlearn-primary',
      view: 'primary',
      alt: 'Illustrative preview of a resource catalogue with licence, language and offline-suitability metadata on each card.',
      caption:
        'Catalogue cards carrying licence, language and offline-suitability metadata.',
      isIllustrative: true,
    },
    {
      id: 'openlearn-detail',
      view: 'detail',
      alt: 'Illustrative preview of a side-by-side translation review screen with comments and approval status.',
      caption:
        'Translation review: source and target text side by side with approval state.',
      isIllustrative: true,
    },
  ],
  architecture: [
    {
      id: 'client',
      label: 'React + TypeScript client',
      layer: 'client',
      description:
        'Catalogue, resource detail, adaptation workspace, translation review and collections.',
      connectsTo: ['api'],
    },
    {
      id: 'api',
      label: 'FastAPI service',
      layer: 'api',
      description:
        'Search, resource records, contributions, review actions and attribution export.',
      connectsTo: ['catalogue'],
    },
    {
      id: 'catalogue',
      label: 'Catalogue domain',
      layer: 'domain',
      description:
        'Licence interpretation, deduplication, moderation states and takedown handling.',
      connectsTo: ['database', 'search'],
    },
    {
      id: 'connectors',
      label: 'Source connectors',
      layer: 'integration',
      description:
        'Isolated adapters for approved public APIs and feeds, with rate limits and health reporting.',
      connectsTo: ['catalogue'],
    },
    {
      id: 'search',
      label: 'Full-text search',
      layer: 'data',
      description:
        'PostgreSQL full-text search over titles, descriptions, subjects, languages and licence fields.',
      connectsTo: ['database'],
    },
    {
      id: 'storage',
      label: 'Object storage',
      layer: 'integration',
      description:
        'Locally hosted files where the licence permits redistribution, with attribution kept alongside.',
    },
    {
      id: 'database',
      label: 'PostgreSQL',
      layer: 'data',
      description:
        'Resources, sources, licences, adaptations, translations, collections, reviews and moderation records.',
    },
  ],
  caseStudy: {
    problem:
      'Open educational resources exist in large numbers and are still hard to use. Search engines return links without licence context, translations float free of their sources, and a teacher who adapts a worksheet may unknowingly strip the attribution the licence requires. The information needed to reuse material responsibly is usually the information that is missing.',
    users: [
      'Teachers looking for material they can legally adapt',
      'Translators and localisation contributors',
      'Curriculum specialists sourcing contextually relevant examples',
      'Libraries, NGOs and programme teams assembling resource packs',
    ],
    constraints: [
      'A licence that is missing or ambiguous cannot be interpreted as permissive.',
      'External sources have their own terms, rate limits and availability; connectors must respect them.',
      'Translation quality affects learner comprehension, so machine output needs human approval.',
      'Uploads require the contributor to assert rights, and takedown requests must be actionable.',
    ],
    workflow: [
      {
        title: 'Search the catalogue',
        description:
          'Filter by subject, level, language, format, accessibility features, licence and connectivity needs.',
      },
      {
        title: 'Inspect source and licence',
        description:
          'Read creator, source, licence, attribution text and review status on the resource record.',
      },
      {
        title: 'Adapt or translate',
        description:
          'Create a linked adaptation or a translation draft that preserves the source relationship.',
      },
      {
        title: 'Review side by side',
        description:
          'A reviewer compares source and target or adaptation and original, comments and approves.',
      },
      {
        title: 'Share with attribution',
        description:
          'Publish or add to a collection with the attribution text the recorded licence requires.',
      },
    ],
    engineeringDecisions: [
      {
        title: 'Provenance is mandatory for approved records',
        description:
          'Source, creator and licence fields are required before a resource can leave review. Records with unknown licence enter the catalogue as link-only entries with reuse disabled.',
      },
      {
        title: 'Licence interpretation is explicit and limited',
        description:
          'Reuse guidance maps a recorded licence to permitted and prohibited actions and states its own limits — including that the platform is not giving legal advice and that missing metadata means reuse cannot be confirmed.',
      },
      {
        title: 'Connectors are isolated adapters',
        description:
          'Each approved source has its own module with documented endpoints, rate limits and failure behaviour, so one failing upstream source cannot break search or corrupt existing records.',
      },
      {
        title: 'Adaptations and translations keep their lineage',
        description:
          'Derived records reference their source resource and inherit the licence obligation, which is what makes an attribution list export possible later.',
      },
      {
        title: 'Drafts are not public',
        description:
          'Machine-translation drafts, unpublished adaptations and review comments are visible only within the review workflow, so learners never encounter unapproved text.',
      },
      {
        title: 'Takedown is a first-class workflow',
        description:
          'Reports create reviewable records with an audit trail, and withdrawal preserves the history rather than deleting evidence of the decision.',
      },
    ],
    testing: [
      'Licence display and reuse guidance for permissive, restrictive, share-alike and unknown licences.',
      'Attribution export correctness for collections and single resources.',
      'Connector failure handling and source health reporting.',
      'Deduplication and moderation transitions, including takedown outcomes.',
      'Permission checks for publishing, review and translation approval.',
      'Upload validation for type, size and contributor rights confirmation.',
    ],
    limitations: [
      'Licence metadata quality depends on the upstream source; where it is incomplete the platform refuses to claim reusability rather than guessing.',
      'Reuse guidance is not legal advice and does not cover jurisdiction-specific nuances.',
      'Search is PostgreSQL full-text search; no semantic or vector search is implemented.',
      'Machine translation is provider-dependent and remains unreviewed until a person approves it.',
      'Offline suitability is an indicator based on file format and licence, not a guarantee that a given device can store the file.',
    ],
    futureImprovements: [
      'Dedicated search infrastructure if catalogue growth justifies it, with a documented relevance evaluation.',
      'Structured attribution export in citation formats used by libraries.',
      'A contribution-quality score built from reviewer feedback, kept separate from popularity.',
      'Bulk import tooling for institutions with existing catalogues and spreadsheets.',
    ],
  },
  featured: false,
  status: 'completed',
  displayOrder: 6,
  relatedSlugs: ['teachcraft', 'reachlearn', 'eduaccess'],
  demoRequirements:
    'Catalogue, review workflows and licence guidance run locally with seeded demonstration resources whose licences are marked as demonstration data. External connectors are disabled until configured.',
};
