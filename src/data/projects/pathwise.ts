import type { PortfolioProject } from '@/types';

export const pathwise: PortfolioProject = {
  id: 'project-04-pathwise',
  slug: 'pathwise',
  name: 'PathWise',
  shortDescription:
    'A diagnostic assessment platform that maps questions to skills, estimates topic-level mastery from recorded evidence, and recommends explainable next steps.',
  longDescription:
    'PathWise starts from evidence rather than percentages. Every question is mapped to one or more skills with prerequisites, each response is stored as evidence against those skills, and a transparent weighted model produces a mastery estimate that states how much evidence it rests on. Recommendations come with a plain-language rationale, and a teacher can override any of them with a recorded reason.',
  primaryCategory: 'Education Technology / Assessment / Learning Analytics',
  categories: [
    'assessment-analytics',
    'ai-personalized',
    'teacher-tools',
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
    'SQLAlchemy',
    'PostgreSQL',
    'Python data tooling (bounded analysis)',
  ],
  featureTags: [
    'Skill map',
    'Evidence-based mastery',
    'Recommendation rationale',
    'Spaced review',
    'Versioned assessments',
  ],
  features: [
    {
      title: 'Skills and prerequisite graphs',
      description:
        'Educators define learning objectives, skills and the prerequisite relationships between them, which is what allows a recommendation to point at a gap underneath the current topic.',
      importance:
        'Learning gaps are usually prerequisites, not the topic the learner is currently failing.',
    },
    {
      title: 'Assessment types for different purposes',
      description:
        'Diagnostic pre-tests, formative checks, practice sets and post-tests, each with their own reporting intent.',
      importance:
        'A diagnostic should identify what to teach; a post-test should show what changed, and they are not the same instrument.',
    },
    {
      title: 'Question types with explicit scoring rules',
      description:
        'Multiple choice, multiple select, numeric, true/false and rubric-scored short response, with scoring rules attached to the assessment version rather than to the question in isolation.',
      importance:
        'Scoring rules change; results recorded under older rules must stay interpretable.',
    },
    {
      title: 'Evidence records per response',
      description:
        'Each response produces evidence linked to a skill, with the assessment version, timestamp and correctness or rubric outcome retained.',
      importance:
        'A mastery estimate is only as good as the trace it can be rebuilt from.',
    },
    {
      title: 'Transparent mastery estimates',
      description:
        'A weighted model with configurable recency decay and minimum-evidence thresholds returns a state — mastered, developing, not yet assessed — plus the count and recency of the evidence behind it.',
      importance:
        'Learners and teachers should be able to see why the system believes something, and when it does not know.',
    },
    {
      title: 'Recommendations with rationale',
      description:
        'Next steps are selected from prerequisite gaps, low-confidence topics, recent mistakes and learner goals, and each recommendation renders the rule that produced it.',
      importance:
        'A recommendation a teacher cannot interrogate is a recommendation they will not trust or follow.',
    },
    {
      title: 'Spaced review scheduling',
      description:
        'Topics below threshold enter a review queue with an interval that grows as evidence improves.',
      importance:
        'Retention, not initial correctness, is what assessment should be protecting.',
    },
    {
      title: 'Teacher overrides and intervention notes',
      description:
        'Teachers can override any recommendation, assign targeted work to a group and record why, with the override stored next to the original suggestion.',
      importance:
        'The educator remains the decision-maker; the model is a second opinion with a short memory.',
    },
  ],
  visualLabel: 'Illustrative skill-map and mastery-evidence preview',
  previews: [
    {
      id: 'pathwise-primary',
      view: 'primary',
      alt: 'Illustrative preview of a skill map showing mastered, developing and not-yet-assessed topics with prerequisite links.',
      caption:
        'Skill map with prerequisite links and deterministic topic states.',
      isIllustrative: true,
    },
    {
      id: 'pathwise-detail',
      view: 'detail',
      alt: 'Illustrative preview of a recommended next step panel showing the rule and evidence behind a recommendation.',
      caption:
        'Recommendation panel: the rule, the evidence and the teacher override control.',
      isIllustrative: true,
    },
  ],
  architecture: [
    {
      id: 'client',
      label: 'React + TypeScript client',
      layer: 'client',
      description:
        'Diagnostic flow, assessment runner, skill map and teacher intervention views.',
      connectsTo: ['api'],
    },
    {
      id: 'api',
      label: 'FastAPI service',
      layer: 'api',
      description:
        'Authoring, attempt delivery, autosave, resume and reporting endpoints.',
      connectsTo: ['delivery', 'mastery', 'recommender'],
    },
    {
      id: 'delivery',
      label: 'Assessment delivery',
      layer: 'domain',
      description:
        'Versioned assessment snapshots, timing, accommodations and attempt state.',
      connectsTo: ['database'],
    },
    {
      id: 'scoring',
      label: 'Scoring engine',
      layer: 'domain',
      description:
        'Per-question scoring rules attached to the assessment version, including partial credit and rubrics.',
      connectsTo: ['evidence-store'],
    },
    {
      id: 'evidence-store',
      label: 'Evidence store',
      layer: 'data',
      description:
        'Skill-linked evidence records that every estimate is derived from.',
      connectsTo: ['database'],
    },
    {
      id: 'mastery',
      label: 'Mastery estimator',
      layer: 'domain',
      description:
        'Weighted evidence model with recency decay, minimum-evidence rules and versioned parameters.',
      connectsTo: ['recommender'],
    },
    {
      id: 'recommender',
      label: 'Recommendation engine',
      layer: 'domain',
      description:
        'Rule-based next-step selection that emits machine-readable evidence and a readable rationale.',
      connectsTo: ['database'],
    },
    {
      id: 'database',
      label: 'PostgreSQL',
      layer: 'data',
      description:
        'Skills, prerequisites, question banks, versions, attempts, estimates, overrides and audit history.',
    },
  ],
  caseStudy: {
    problem:
      'Progress in most course platforms is a completion percentage, which says nothing about what a learner can actually do. Teachers are left guessing which topic to reteach, learners are shown a number with no explanation, and neither can see the difference between "weak on this topic" and "we have no evidence about this topic yet".',
    users: [
      'Teachers deciding what to reteach and who needs support',
      'Learners practising with a clear view of what to work on next',
      'Tutoring programmes diagnosing learners before assigning support',
      'Curriculum teams maintaining objectives and question banks',
    ],
    constraints: [
      'A single score must never be presented as fixed ability, and low evidence must be distinguishable from low mastery.',
      'Assessment versions and scoring rules change, so historical results must remain interpretable.',
      'Recommendations must be explainable without exposing a black box to learners or teachers.',
      'Individual results are access-restricted; group reporting must not reveal an individual learner.',
    ],
    workflow: [
      {
        title: 'Define skills and prerequisites',
        description:
          'Educators author learning objectives, skills, prerequisite relationships and mastery thresholds.',
      },
      {
        title: 'Assess',
        description:
          'A diagnostic, formative check or post-test is delivered with autosave, resume and configured accommodations.',
      },
      {
        title: 'Record evidence',
        description:
          'Each response is scored under the assessment version\u2019s rules and stored as skill-linked evidence.',
      },
      {
        title: 'Estimate mastery',
        description:
          'The estimator returns a state with recency weighting and an evidence count, or "not yet assessed" when evidence is thin.',
      },
      {
        title: 'Recommend a next step',
        description:
          'The recommender selects a lesson or practice set and renders the rule and evidence behind it.',
      },
      {
        title: 'Review, override and re-assess',
        description:
          'Teachers override or annotate where professional judgement differs; spaced review keeps mastered topics warm.',
      },
    ],
    engineeringDecisions: [
      {
        title: 'Evidence first, scores second',
        description:
          'Nothing is stored as a mastery number without the individual evidence records that produced it, so the estimate can be recomputed with new parameters and audited per learner.',
      },
      {
        title: 'Assessment versions are immutable snapshots',
        description:
          'Publishing a new version freezes questions, mapping, scoring rules and thresholds. Historical attempts keep referring to the version they were taken under, which is what makes reporting across a revision honest.',
      },
      {
        title: 'An explicit "not yet assessed" state',
        description:
          'Below a configurable minimum evidence count, the model returns not-yet-assessed instead of a low mastery estimate, so the interface never implies a learner failed a topic that was never covered.',
      },
      {
        title: 'A rule-based model, and it says so',
        description:
          'The estimator is weighted evidence with configurable recency decay — documented, reproducible and inspectable. It is not an item-response model and no psychometric claim is made for it; the estimator interface exists so a validated model can replace it later without rewriting the product.',
      },
      {
        title: 'Rationale generated from the rule trace',
        description:
          'Recommendation text is rendered from the machine-readable factors that produced it rather than generated by a language model, so the explanation cannot drift from the decision.',
      },
      {
        title: 'Teacher judgement is recorded, not overwritten',
        description:
          'An override stores the original recommendation, the teacher\u2019s decision and the reason, keeping both positions in the audit trail.',
      },
    ],
    testing: [
      'Scoring rules per question type, including partial credit and rubric outcomes.',
      'Assessment versioning: an attempt is scored under the rules it was taken with.',
      'Mastery estimation: recency weighting, minimum evidence thresholds and monotonic behaviour as evidence improves.',
      'Prerequisite handling in recommendation selection, including cycles in the prerequisite graph.',
      'Recommendation rationale matching the factors actually used.',
      'Permissions for individual results, group reporting and teacher overrides.',
      'Pre/post report arithmetic against recorded evidence.',
    ],
    limitations: [
      'The mastery model is transparent rule-based weighting, not a validated psychometric model, and its thresholds are calibration guesses until evaluated against real cohorts.',
      'Short-answer scoring is rubric-assisted and, in this implementation, depends on teacher review rather than automated semantic grading.',
      'Recommendations are suggestions: no claim is made that they improve outcomes, and none has been measured.',
      'Small cohorts constrain group reporting, and no attempt is made to extrapolate cohort statistics to individuals.',
      'Accommodation handling covers timing and question selection, not every accommodation a school may use.',
    ],
    futureImprovements: [
      'An evaluation study with a held-out cohort to calibrate thresholds and report reliability honestly.',
      'Item-level difficulty statistics derived from accumulated evidence, with a documented estimation method.',
      'Adaptive question selection that shortens diagnostics without losing evidence quality.',
      'Export of evidence records in a documented format for research or programme reporting.',
    ],
  },
  featured: true,
  status: 'completed',
  displayOrder: 4,
  relatedSlugs: ['learnbridge', 'tutorspring', 'learnpulse'],
  demoRequirements:
    'Fully functional with seeded synthetic objectives, questions and learners. No external services or credentials are required.',
};
