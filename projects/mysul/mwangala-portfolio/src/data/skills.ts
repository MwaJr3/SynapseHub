import { getProject, projects } from './projects';
import type { Project } from '@/types/project';

/**
 * Skills are evidence-based: every entry points at the projects where the
 * technology or practice was actually used. There are no proficiency
 * percentages anywhere in this portfolio — a number like "Python 95%" has no
 * defensible measurement behind it, so instead each skill links to work.
 */

export interface Skill {
  name: string;
  /** One-line note about how it is used, not a self-rating. */
  note: string;
  /** Project slugs where this is demonstrated. Validated against the registry. */
  evidence: string[];
  /** True when this is a learning interest rather than shipped project work. */
  interest?: boolean;
}

export interface SkillGroup {
  id: string;
  title: string;
  summary: string;
  skills: Skill[];
}

export const skillGroups: SkillGroup[] = [
  {
    id: 'backend',
    title: 'Python & Backend Engineering',
    summary:
      'Service design in Python: typed APIs, validated input, relational persistence, background work and analysis engines kept separate from transport and presentation.',
    skills: [
      {
        name: 'Python',
        note: 'Primary language across every project — parsing, analysis engines, orchestration and APIs.',
        evidence: projects.map((p) => p.slug),
      },
      {
        name: 'FastAPI',
        note: 'Typed REST APIs with dependency-injected authorisation and generated OpenAPI documentation.',
        evidence: projects.map((p) => p.slug),
      },
      {
        name: 'Pydantic',
        note: 'Request/response models, configuration validation and structured-output schemas for model responses.',
        evidence: ['phishlens', 'threatintel-desk', 'incidentflow', 'transcriptwise', 'securecode-workbench'],
      },
      {
        name: 'SQLAlchemy & Alembic',
        note: 'Declarative models, relationships, constraints and versioned migrations.',
        evidence: ['incidentflow', 'assetwatch', 'securecode-workbench', 'transcriptwise', 'netscope'],
      },
      {
        name: 'API design',
        note: 'Versioned endpoint groups, consistent error envelopes, pagination and filter contracts.',
        evidence: ['incidentflow', 'threatintel-desk', 'transcriptwise', 'phishlens'],
      },
      {
        name: 'Background processing',
        note: 'Jobs with real status, progress, timeouts, cancellation and recoverable failure.',
        evidence: ['netscope', 'assetwatch', 'threatintel-desk', 'transcriptwise'],
      },
      {
        name: 'Input validation',
        note: 'Size, encoding, structure and content checks before any untrusted input is processed.',
        evidence: ['phishlens', 'netscope', 'hashsight', 'securecode-workbench', 'transcriptwise'],
      },
      {
        name: 'Automated testing (pytest)',
        note: 'Unit tests for domain rules, integration tests for API flows, mocked external services.',
        evidence: projects.map((p) => p.slug),
      },
    ],
  },
  {
    id: 'frontend',
    title: 'Frontend & Full-Stack Development',
    summary:
      'Interfaces that carry dense technical information clearly, with real states for loading, empty, error and success.',
    skills: [
      {
        name: 'React',
        note: 'Component-driven UIs for dashboards, analysis workspaces and long-form reading views.',
        evidence: projects.map((p) => p.slug),
      },
      {
        name: 'TypeScript',
        note: 'Shared types across the client, including typed registries and validated props.',
        evidence: projects.map((p) => p.slug),
      },
      {
        name: 'Tailwind CSS',
        note: 'Token-driven styling with a semantic colour system supporting light and dark surfaces.',
        evidence: projects.map((p) => p.slug),
      },
      {
        name: 'Responsive layout',
        note: 'Desktop, tablet and mobile layouts; data tables that degrade to readable stacks on narrow screens.',
        evidence: ['netscope', 'incidentflow', 'transcriptwise', 'assetwatch'],
      },
      {
        name: 'API integration & server state',
        note: 'Query caching, optimistic updates with rollback, and error surfaces that offer recovery.',
        evidence: ['incidentflow', 'threatintel-desk', 'assetwatch', 'transcriptwise'],
      },
      {
        name: 'Form validation',
        note: 'Schema-driven client validation mirrored by server-side checks.',
        evidence: ['phishlens', 'securecode-workbench', 'transcriptwise', 'assetwatch'],
      },
      {
        name: 'Accessible interface design',
        note: 'Semantic HTML, keyboard operation, visible focus, announced status, contrast in both themes.',
        evidence: ['cyberaware-lab', 'transcriptwise', 'incidentflow'],
      },
      {
        name: 'Data visualisation (SVG)',
        note: 'Charts drawn from aggregated series with absolute values alongside every proportion.',
        evidence: ['netscope', 'threatintel-desk', 'assetwatch', 'securecode-workbench'],
      },
    ],
  },
  {
    id: 'security',
    title: 'Defensive Cybersecurity',
    summary:
      'Demonstrated project areas in defensive security. These are things I have built tooling for, not certifications or formal specialisations.',
    skills: [
      {
        name: 'Phishing & email analysis',
        note: 'Header parsing, sender/reply-to mismatches, urgency and impersonation indicators, explainable findings.',
        evidence: ['phishlens'],
      },
      {
        name: 'URL analysis',
        note: 'Static lexical and structural evaluation of suspicious links without visiting them.',
        evidence: ['phishlens'],
      },
      {
        name: 'Email authentication (SPF, DKIM, DMARC)',
        note: 'Interpreting Authentication-Results, including the difference between failure and absence.',
        evidence: ['phishlens'],
      },
      {
        name: 'Network traffic inspection',
        note: 'Packet-capture parsing, protocol and conversation analysis, indicator rules over traffic metadata.',
        evidence: ['netscope'],
      },
      {
        name: 'Threat-intelligence processing',
        note: 'Connector-based ingestion, normalisation, deduplication with provenance, confidence mapping.',
        evidence: ['threatintel-desk'],
      },
      {
        name: 'Incident management',
        note: 'Lifecycle state machines, append-only timelines, findings, tasks and auditable reporting.',
        evidence: ['incidentflow'],
      },
      {
        name: 'File-hash investigation',
        note: 'Local digest computation, reputation provider normalisation, honest unknown/unavailable states.',
        evidence: ['hashsight'],
      },
      {
        name: 'Asset inventory & exposure monitoring',
        note: 'Authorized-target allowlists, immutable observation snapshots, change detection, remediation tracking.',
        evidence: ['assetwatch'],
      },
      {
        name: 'Static application security analysis',
        note: 'Orchestrating Bandit and secret scanning, normalising findings, managing triage and false positives.',
        evidence: ['securecode-workbench'],
      },
      {
        name: 'Security awareness education',
        note: 'Designing safe fictional simulations, assessment with reasoning-based feedback, honest progress reporting.',
        evidence: ['cyberaware-lab'],
      },
    ],
  },
  {
    id: 'data',
    title: 'Data Processing & Integration',
    summary:
      'Getting messy external input into a shape a person can reason about — and keeping track of where every value came from.',
    skills: [
      {
        name: 'Data normalisation',
        note: 'Canonical forms for indicators, packets, findings and transcripts, with the original value retained.',
        evidence: ['threatintel-desk', 'netscope', 'securecode-workbench', 'transcriptwise'],
      },
      {
        name: 'File parsing',
        note: 'Email messages, packet captures, subtitle formats, archives and analyzer output.',
        evidence: ['phishlens', 'netscope', 'transcriptwise', 'securecode-workbench'],
      },
      {
        name: 'Relational data modelling',
        note: 'Entity separation that preserves history: observations vs assets, findings vs observations, indicators vs reports.',
        evidence: ['incidentflow', 'assetwatch', 'threatintel-desk', 'hashsight'],
      },
      {
        name: 'Deduplication & identity',
        note: 'Canonical keys for indicators and fingerprints for static-analysis findings across scans.',
        evidence: ['threatintel-desk', 'securecode-workbench'],
      },
      {
        name: 'Aggregation & comparison',
        note: 'Streaming accumulators for large inputs, snapshot diffing for change detection.',
        evidence: ['netscope', 'assetwatch'],
      },
      {
        name: 'Third-party API integration',
        note: 'Adapter interfaces, credential handling server-side, rate limits, retry and failure taxonomy.',
        evidence: ['threatintel-desk', 'hashsight', 'assetwatch'],
      },
      {
        name: 'Report generation',
        note: 'Markdown, JSON and print exports assembled from the same structured records the UI reads.',
        evidence: projects.map((p) => p.slug),
      },
      {
        name: 'Applied LLM integration',
        note: 'Provider-independent clients, versioned prompts, schema-validated structured output, bounded repair.',
        evidence: ['transcriptwise'],
      },
    ],
  },
  {
    id: 'practices',
    title: 'Engineering Practices',
    summary: 'Habits that show up across the work rather than in any single project.',
    skills: [
      {
        name: 'Modular architecture',
        note: 'Retrieval, parsing, analysis, storage and presentation kept replaceable independently.',
        evidence: ['transcriptwise', 'netscope', 'threatintel-desk', 'securecode-workbench'],
      },
      {
        name: 'Authentication & authorisation',
        note: 'Established password hashing, expiring sessions, role checks in dependencies, ownership in query scope.',
        evidence: ['incidentflow', 'cyberaware-lab', 'assetwatch', 'transcriptwise'],
      },
      {
        name: 'Database migrations',
        note: 'Versioned schema changes applied reproducibly across environments.',
        evidence: ['incidentflow', 'assetwatch', 'transcriptwise', 'netscope'],
      },
      {
        name: 'Secure handling of untrusted input',
        note: 'Path-traversal and archive-bomb controls, SSRF restriction, no execution of submitted content, injection-resistant prompting.',
        evidence: ['securecode-workbench', 'netscope', 'assetwatch', 'transcriptwise'],
      },
      {
        name: 'Honest failure states',
        note: 'Partial results disclose their scope; unavailable services report as unavailable instead of empty.',
        evidence: ['netscope', 'transcriptwise', 'hashsight', 'assetwatch'],
      },
      {
        name: 'Documentation',
        note: 'READMEs covering setup, configuration, migrations, tests, deployment and known limitations.',
        evidence: projects.map((p) => p.slug),
      },
      {
        name: 'Version control & reproducible builds',
        note: 'Pinned dependencies, environment templates without secrets, documented build and test commands.',
        evidence: projects.map((p) => p.slug),
      },
      {
        name: 'Containerisation & deployment configuration',
        note: 'Service definitions, environment validation at startup, secure production defaults.',
        evidence: ['incidentflow', 'transcriptwise', 'netscope'],
        interest: false,
      },
    ],
  },
  {
    id: 'interests',
    title: 'Current Learning Interests',
    summary:
      'Areas I am actively studying that are not yet represented by a shipped project. Listed separately so they are never mistaken for demonstrated experience.',
    skills: [
      {
        name: 'Detection engineering',
        note: 'Writing and evaluating detection rules against realistic telemetry, and measuring false-positive cost.',
        evidence: [],
        interest: true,
      },
      {
        name: 'Cloud security posture',
        note: 'Identity and access review, storage exposure and configuration drift in cloud environments.',
        evidence: [],
        interest: true,
      },
      {
        name: 'Retrieval-augmented generation',
        note: 'Grounding model output in retrieved source material with verifiable citations.',
        evidence: ['transcriptwise'],
        interest: true,
      },
      {
        name: 'Formal verification of workflows',
        note: 'Proving state-machine properties rather than only testing them.',
        evidence: [],
        interest: true,
      },
    ],
  },
];

/* ------------------------------------------------------------------ helpers */

const skillProblems: string[] = [];
for (const group of skillGroups) {
  for (const skill of group.skills) {
    for (const slug of skill.evidence) {
      if (!getProject(slug)) {
        skillProblems.push(`skill "${skill.name}" references unknown project "${slug}"`);
      }
    }
  }
}
if (skillProblems.length > 0) {
  throw new Error(`[skills] invalid evidence references:\n- ${skillProblems.join('\n- ')}`);
}

/** Projects that demonstrate a given skill, resolved to full records. */
export function evidenceProjects(skill: Skill): Project[] {
  return skill.evidence
    .map((slug) => getProject(slug))
    .filter((project): project is Project => project !== undefined);
}

/** Reverse index: project slug -> skill names it evidences. */
export function skillsByProject(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const group of skillGroups) {
    for (const skill of group.skills) {
      for (const slug of skill.evidence) {
        const list = map.get(slug) ?? [];
        list.push(skill.name);
        map.set(slug, list);
      }
    }
  }
  return map;
}
