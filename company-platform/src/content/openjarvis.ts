/**
 * OpenJarvis, and what this repository did with it.
 *
 * Read before writing it: the project site (openjarvis.stanford.edu), the docs
 * (open-jarvis.github.io/OpenJarvis), the server's own route table
 * (`src/openjarvis/server/routes.py` in the upstream repository) and the licence
 * file. Everything stated on the page is one of those four sources or is
 * described as this repository's own work.
 *
 * Three things this file deliberately does **not** claim:
 *
 * - That the fork (`github.com/MwaJr3/OpenJarvis`) is our work. It is a fork of
 *   `open-jarvis/OpenJarvis`, and when it was inspected its `main` was identical
 *   to upstream's — so the honest description is "a fork, kept in sync", not
 *   "a product of ours".
 * - Any benchmark number for the models we point at. The upstream research
 *   publishes its own results; repeating them as if this site had measured them
 *   would be the exact kind of borrowing this platform avoids.
 * - That any deployed assistant is *running* on OpenJarvis. Nothing is deployed:
 *   the assistants are off until an endpoint is configured, and the page says so.
 */

export interface Fact {
  label: string;
  value: string;
}

export interface SourceLink {
  label: string;
  href: string;
  note: string;
}

/** Where the information comes from. Every claim on the page traces to one. */
export const OPENJARVIS_SOURCES: SourceLink[] = [
  {
    label: 'openjarvis.stanford.edu',
    href: 'https://openjarvis.stanford.edu/',
    note: 'The project site: the five primitives, the quick start, the showcase gallery.',
  },
  {
    label: 'Documentation',
    href: 'https://open-jarvis.github.io/OpenJarvis/',
    note: 'Install, CLI, SDK, architecture, and the OpenAI-compatible server.',
  },
  {
    label: 'Upstream repository (Apache-2.0)',
    href: 'https://github.com/open-jarvis/OpenJarvis',
    note: 'The source. The licence is Apache-2.0; the server route table below is read from it.',
  },
  {
    label: 'This fork',
    href: 'https://github.com/MwaJr3/OpenJarvis',
    note: 'A fork of the above, kept in sync. Not our work — we did not author OpenJarvis.',
  },
];

/** What OpenJarvis is, in the project's own terms. */
export const WHAT_IT_IS = {
  title: 'Personal AI, on personal devices',
  summary:
    'OpenJarvis is a research framework for composable, on-device AI systems: a stack for running ' +
    'personal AI agents on your own hardware, with cloud APIs as an option rather than the default.',
  primitives: [
    {
      name: 'Intelligence',
      detail:
        'Pick a model, or let the framework pick one for the hardware. It manages a catalogue of local models across providers.',
    },
    {
      name: 'Engine',
      detail:
        'The inference runtime: Ollama, vLLM, SGLang, llama.cpp and cloud APIs behind one interface, chosen after detecting the hardware.',
    },
    {
      name: 'Agents',
      detail:
        'Multi-step reasoning with tool use — eight built-in agent types, from plain chat to orchestrated workflows.',
    },
    {
      name: 'Tools & memory',
      detail:
        'Web search, a calculator, file I/O, a code interpreter, retrieval, persistent local state, and external MCP servers.',
    },
    {
      name: 'Learning',
      detail:
        'Interactions produce traces that are used to improve weights, prompts and agent behaviour over time.',
    },
  ] as const,
};

/**
 * The surface this repository depends on.
 *
 * Not a summary of OpenJarvis — only the endpoints the integration calls, read
 * from the server's route table so the page can state exactly what the contract
 * is instead of implying one.
 */
export const SERVER_CONTRACT: Fact[] = [
  { label: 'Start it', value: '`jarvis serve` — a FastAPI server on http://localhost:8000' },
  { label: 'Chat', value: '`POST /v1/chat/completions` — streaming and non-streaming' },
  { label: 'Models', value: '`GET /v1/models` — the installed-model list' },
  { label: 'Pull a model', value: '`POST /v1/models/pull`' },
  { label: 'Info', value: '`GET /v1/info`, and cost/energy telemetry at `GET /v1/savings`' },
  {
    label: 'Auth',
    value: 'An endpoint on the same machine: no token. The client still sends a placeholder, which the server ignores.',
  },
];

/**
 * What this repository actually did — the only part that is ours.
 *
 * Written as conduct, not as a feature list: each line is something a reader can
 * check in this repository.
 */
export interface IntegrationStep {
  id: string;
  title: string;
  detail: string;
  /** Where it lives, so the claim is auditable rather than promotional. */
  path: string;
}

export const WHAT_THIS_REPOSITORY_DID: IntegrationStep[] = [
  {
    id: 'preset',
    title: 'An `openjarvis` provider preset',
    detail:
      'The two assistants already spoke OpenAI’s chat-completions protocol. Naming OpenJarvis as a preset is ' +
      'the whole integration: point the deployment at http://127.0.0.1:8000/v1, name an installed model, ' +
      'and the existing request path works unchanged.',
    path: 'company-platform/src/lib/assistant/provider.ts',
  },
  {
    id: 'no-key',
    title: 'Recognised as local, so it needs no token',
    detail:
      'A preset that authenticates nobody must not ask for a key. The configuration check treats a loopback ' +
      'endpoint as unauthenticated and only demands ASSISTANT_API_KEY for a remote one — otherwise a local ' +
      'setup would be reported as misconfigured.',
    path: 'company-platform/src/lib/assistant/provider.ts',
  },
  {
    id: 'no-default-model',
    title: 'No invented default model',
    detail:
      'Only `jarvis model` knows what is installed, so the preset ships without a model id and the ' +
      'configuration report asks for one by name. A guessed default would fail at the first question with ' +
      'a provider error nobody could interpret.',
    path: 'company-platform/src/lib/assistant/provider.ts',
  },
  {
    id: 'config-check',
    title: 'A configuration report that names what is missing',
    detail:
      '`npm run config:check` (and `/admin/settings`) says whether the assistant, the contact form, storage ' +
      'and the database are configured, using variable names and never values. It exits non-zero when a ' +
      'deployment-critical item is absent, so a green build cannot hide it again.',
    path: 'company-platform/src/lib/config-check.ts',
  },
  {
    id: 'same-protocol',
    title: 'One protocol for every product that needs a model',
    detail:
      'TutorSpring and TranscriptWise already take an OpenAI-compatible base URL from the environment. ' +
      'Pointing them at `jarvis serve` needs a value, not a code change — which is why the page documents ' +
      'the endpoint once rather than adding a client to each project.',
    path: 'companies/tamuzi',
  },
];

/**
 * Products that need a model, and what each one already accepts.
 *
 * The last column is the point: none of them needs new code to use a local
 * OpenJarvis server, only configuration. Stated as configuration, not as an
 * integration that has been run — none of these is deployed.
 */
export interface ProductWithModel {
  product: string;
  company: string;
  whatNeedsAModel: string;
  /** The variable that points it at an OpenAI-compatible endpoint. */
  configuration: string;
  /** Where in the tree that variable is read — repository-root-relative. */
  path: string;
  /**
   * The tokens that file must literally contain. Separated from `configuration`
   * because pydantic derives `AI_PROVIDER` from a field named `ai_provider`, so
   * the environment name never appears in that source.
   */
  reads: string[];
}

export const PRODUCTS_USING_A_MODEL: ProductWithModel[] = [
  {
    product: 'TutorSpring',
    company: 'Tamuzi Learning',
    whatNeedsAModel: 'Drafts a tutoring reply grounded in the course material the student used.',
    configuration:
      'TUTORSPRING_LLM_BASE_URL=http://127.0.0.1:8000/v1 with TUTORSPRING_LLM_MODEL and TUTORSPRING_LLM_API_KEY',
    path: 'companies/tamuzi/tutorspring/backend/app/providers.py',
    reads: ['TUTORSPRING_LLM_BASE_URL', 'TUTORSPRING_LLM_API_KEY', 'TUTORSPRING_LLM_MODEL'],
  },
  {
    product: 'TranscriptWise',
    company: 'Tamuzi Learning',
    whatNeedsAModel: 'Turns a transcript into structured study notes, summaries and questions.',
    configuration:
      'AI_PROVIDER=openai_compatible with AI_BASE_URL=http://127.0.0.1:8000/v1, AI_MODEL and AI_API_KEY',
    path: 'companies/tamuzi/transcriptwise/backend/app/config.py',
    reads: ['ai_provider', 'ai_base_url', 'ai_model', 'ai_api_key'],
  },
];

/** Where the integration is visible on this site. */
export const SITE_ASSISTANTS = {
  note:
    'The two public assistants on this platform — IT triage for Velaqori Systems and study planning for Tamuzi ' +
    'Learning — are the visible consumers of this configuration. They are switched off on any deployment that ' +
    'has not set an endpoint, and the pages say so rather than showing a composer that cannot answer.',
  routes: [
    { href: '/support', label: 'IT triage assistant', company: 'Velaqori Systems' },
    { href: '/study-plan', label: 'Study-planning assistant', company: 'Tamuzi Learning' },
  ],
};

/** Plain-text version of the licence and attribution, for the page footer. */
export const ATTRIBUTION =
  'OpenJarvis is an open-source research project, licensed under Apache-2.0. ' +
  'It is not owned by, affiliated with, or endorsed by Velaqori Systems or Tamuzi Learning. ' +
  'The fork at github.com/MwaJr3/OpenJarvis is a copy kept for reference, not a contribution we authored.';
