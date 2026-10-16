import type { PortfolioProject } from '@/types';

export const tutorspring: PortfolioProject = {
  id: 'project-03-tutorspring',
  slug: 'tutorspring',
  name: 'TutorSpring',
  shortDescription:
    'An AI learning companion that explains concepts, gives graduated hints and generates practice grounded in approved lesson material, with source references and human review.',
  longDescription:
    'TutorSpring is built around a restraint: the tutor should help a learner reach an answer, not hand one over. Explanations are retrieved from approved course material, hints are graduated through the tutor modes, every answer cites the sources it used, and anything the learner flags as confusing goes to a review queue rather than into the void. When no model provider is configured the application runs a clearly labelled deterministic demo mode.',
  primaryCategory: 'AI Applications / Education / Personalized Learning',
  categories: ['ai-personalized', 'full-stack', 'python'],
  technologies: [
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Python',
    'FastAPI',
    'Pydantic',
    'PostgreSQL',
    'pgvector or PostgreSQL full-text search',
    'Provider-agnostic LLM adapter',
    'Background workers',
  ],
  featureTags: [
    'Source grounding',
    'Graduated hints',
    'Provider-agnostic adapter',
    'Review queue',
    'Demo mode',
  ],
  features: [
    {
      title: 'Tutor modes with different intent',
      description:
        'Explain, Give Me a Hint, Practice With Me, Check My Reasoning and Summarise This Lesson each have their own prompt contract, limits and expected response shape.',
      importance:
        'A single "ask anything" box encourages answer-copying; modes make pedagogical intent explicit.',
    },
    {
      title: 'Retrieval over approved material',
      description:
        'The tutor selects passages from the approved corpus for the chosen course and topic, and passes them to the model as untrusted reference data.',
      importance:
        'Grounding is what separates curriculum support from a general chatbot with a school-branded interface.',
    },
    {
      title: 'Source references on answers',
      description:
        'Responses carry references to the lesson passages retrieved for that turn, and the learner can open the source material to read the original.',
      importance:
        'Learners and teachers need to check the claim, not just trust the tone of it.',
    },
    {
      title: 'Graduated hints and attempts-first practice',
      description:
        'Practice mode asks the learner to attempt a problem before revealing a worked solution, and hints escalate through configurable levels.',
      importance:
        'Productive struggle is the point; an instant solution removes the learning.',
    },
    {
      title: 'Level- and language-aware explanation',
      description:
        'Explanation depth is adjustable per learner and per topic, and multilingual output is available when the configured model supports it.',
      importance:
        'A learner may understand a topic in one language and need the explanation in another.',
    },
    {
      title: 'Flagging and teacher review queue',
      description:
        'A learner can flag an explanation as confusing or wrong. Flags route to an authorised reviewer, with conversation content shared only at the level the learner\u2019s settings allow.',
      importance:
        'Learner feedback is the only ground truth available about whether an explanation actually helped.',
    },
    {
      title: 'Retention and deletion controls',
      description:
        'Conversation metadata and history are subject to configurable retention, and a learner can delete their conversation history.',
      importance:
        'Tutoring conversations contain what a learner does not understand — sensitive by nature.',
    },
    {
      title: 'Labelled demo mode',
      description:
        'With no provider configured, the app serves prepared demonstration exchanges that are typed differently and labelled in the interface as not being live model output.',
      importance:
        'A demo must never be mistaken for a working model integration.',
    },
  ],
  visualLabel: 'Illustrative grounded-tutor conversation preview',
  previews: [
    {
      id: 'tutorspring-primary',
      view: 'primary',
      alt: 'Illustrative preview of a tutor conversation with a gradual hint and cited lesson references.',
      caption: 'A grounded explanation with the lesson passages it used.',
      isIllustrative: true,
    },
    {
      id: 'tutorspring-detail',
      view: 'detail',
      alt: 'Illustrative preview of a teacher review queue listing learner-flagged explanations.',
      caption: 'Flagged explanations routed to the teacher review queue.',
      isIllustrative: true,
    },
  ],
  architecture: [
    {
      id: 'client',
      label: 'React + TypeScript client',
      layer: 'client',
      description:
        'Tutor modes, streaming responses, source references and feedback controls.',
      connectsTo: ['api'],
    },
    {
      id: 'api',
      label: 'FastAPI service',
      layer: 'api',
      description:
        'Conversation endpoints, rate limits, retention settings and review-queue actions.',
      connectsTo: ['orchestrator'],
    },
    {
      id: 'orchestrator',
      label: 'Tutor orchestration',
      layer: 'domain',
      description:
        'Mode contracts, prompt assembly, response validation and citation checks.',
      connectsTo: ['retrieval', 'provider-adapter'],
    },
    {
      id: 'retrieval',
      label: 'Retrieval layer',
      layer: 'data',
      description:
        'pgvector or full-text search over approved lesson passages, scoped to course and level.',
      connectsTo: ['database'],
    },
    {
      id: 'provider-adapter',
      label: 'LLM provider adapter',
      layer: 'ai',
      description:
        'One interface for the configured model provider, with timeouts, retries and cost controls.',
    },
    {
      id: 'database',
      label: 'PostgreSQL',
      layer: 'data',
      description:
        'Conversations, messages, flags, review decisions, preferences and retention settings.',
    },
    {
      id: 'worker',
      label: 'Background worker',
      layer: 'worker',
      description:
        'Content ingestion, embedding rebuilds and flag-batch processing.',
      connectsTo: ['retrieval'],
    },
  ],
  caseStudy: {
    problem:
      'Learners who need an extra explanation rarely get one at the moment they are stuck, while generic chatbots answer confidently without any connection to the curriculum, the learner\u2019s level or the material the class is actually using. Teachers, meanwhile, cannot see where explanations failed.',
    users: [
      'Learners practising independently or reviewing before assessment',
      'Teachers supporting mixed ability classes and after-hours questions',
      'Programmes offering affordable tutoring support at scale',
      'Content administrators maintaining the approved material the tutor may use',
    ],
    constraints: [
      'Model output is probabilistic and can be confidently wrong; the interface must never imply verification.',
      'Retrieved text is untrusted input and can contain instructions designed to hijack the tutor.',
      'Provider cost, latency and availability vary, so the integration cannot be hardwired to one vendor.',
      'Tutor conversations are private; a teacher summary must not expose an individual learner without authorisation.',
    ],
    workflow: [
      {
        title: 'Choose context',
        description:
          'The learner picks a course, topic, level and optional goal so retrieval is scoped before the first token is spent.',
      },
      {
        title: 'Ask, hint or practise',
        description:
          'The selected tutor mode determines whether the response explains, hints, asks a question or reviews reasoning.',
      },
      {
        title: 'Retrieve approved passages',
        description:
          'Relevant approved lesson passages are selected and passed to the model as quoted reference data.',
      },
      {
        title: 'Receive a grounded answer',
        description:
          'The response is validated against a schema; citations that do not map to retrieved passages are removed.',
      },
      {
        title: 'Review the source',
        description:
          'The learner opens the referenced lesson passage to read the original material.',
      },
      {
        title: 'Flag or continue',
        description:
          'Confusing or incorrect answers are flagged into the review queue; the conversation continues or is deleted.',
      },
    ],
    engineeringDecisions: [
      {
        title: 'Retrieval scoped to approved material',
        description:
          'Only passages an administrator has approved and published for a course are retrievable, and retrieval is filtered by course, topic and level before the model sees anything.',
      },
      {
        title: 'Provider isolation behind one adapter',
        description:
          'Prompt templates, retrieval, validation and storage know nothing about a specific vendor. Model choice, timeout, retry and token budget are configuration, so the tutor logic is unchanged when the provider changes.',
      },
      {
        title: 'Structured output with citation verification',
        description:
          'Responses are parsed into a typed schema; each citation must match a retrieved passage id, and unmatched or invented citations are dropped before display rather than shown to the learner.',
      },
      {
        title: 'Retrieved content is data, never instruction',
        description:
          'Passages are passed as clearly delimited quoted context, instructions inside them are ignored, and the system prompt is kept separate from retrieved text to reduce prompt-injection surface.',
      },
      {
        title: 'Cost and latency are bounded by design',
        description:
          'Per-user rate limits, token ceilings, retrieval caps and timeouts are applied before the request leaves the server, and provider failures degrade to an explicit unavailable state.',
      },
      {
        title: 'Feedback routes to humans',
        description:
          'Flags create review-queue records with the conversation turn, the reviewer decision and a reason, so the correction loop ends with a person and stays auditable.',
      },
    ],
    testing: [
      'Citation validation: invented references are removed, valid ones are preserved.',
      'Provider failure paths: timeout, rate-limit and malformed response handling.',
      'Conversation deletion and retention behaviour for learners and administrators.',
      'Learner, teacher and administrator permissions, including review-queue visibility.',
      'Output length and mode constraints, such as practice mode withholding a full solution.',
      'Demo-mode labelling so prepared responses are never presented as live model output.',
    ],
    limitations: [
      'Model answers can still be wrong, incomplete, or biased by training data; citations point to the source material, they do not verify the reasoning.',
      'No accuracy or learning-gain figure is published because no formal evaluation has been run.',
      'Retrieval quality depends on the approved corpus; a missing or thin topic limits what the tutor can ground.',
      'Language coverage and cost depend entirely on the configured model provider.',
      'Teacher-level summaries are deliberately coarse: they surface topics, not transcripts.',
    ],
    futureImprovements: [
      'A documented evaluation harness with a held-out question set so grounding quality can be measured rather than asserted.',
      'Text-to-speech for learners who read more easily by listening.',
      'Curriculum alignment mapping between retrieval passages and published learning objectives.',
      'Offline practice sets generated from approved material and cached like any other lesson pack.',
    ],
  },
  featured: true,
  status: 'completed',
  displayOrder: 3,
  relatedSlugs: ['learnbridge', 'pathwise', 'teachcraft'],
  demoRequirements:
    'The interface, retrieval indexing and review workflows run locally with seeded curriculum passages. Live tutoring requires a configured model provider API key, stored server-side; without it the app runs in labelled demo mode.',
};
