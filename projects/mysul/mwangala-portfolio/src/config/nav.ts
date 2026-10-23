import type { FilterId, ProjectCategory } from '@/types/project';

export interface NavItem {
  label: string;
  to: string;
  /** Match rule for the active state ('exact' only matches the path itself). */
  match: 'exact' | 'prefix';
}

export const primaryNav: NavItem[] = [
  { label: 'Home', to: '/', match: 'exact' },
  { label: 'About', to: '/about', match: 'exact' },
  { label: 'Projects', to: '/projects', match: 'prefix' },
  { label: 'Skills', to: '/skills', match: 'exact' },
  { label: 'Engineering Approach', to: '/approach', match: 'exact' },
  { label: 'Contact', to: '/contact', match: 'exact' },
];

export const filters: { id: FilterId; label: string; hint: string }[] = [
  { id: 'all', label: 'All Projects', hint: 'Everything in the registry' },
  { id: 'cybersecurity', label: 'Cybersecurity', hint: 'Defensive security tooling' },
  { id: 'application-security', label: 'Application Security', hint: 'Securing software itself' },
  { id: 'network-analysis', label: 'Network Analysis', hint: 'Traffic, hosts and exposure' },
  { id: 'security-operations', label: 'Security Operations', hint: 'Response and intelligence workflows' },
  { id: 'developer-tools', label: 'Developer Tools', hint: 'Tools used during development' },
  { id: 'education', label: 'Education', hint: 'Learning platforms and study tooling' },
  { id: 'full-stack', label: 'Full-Stack Applications', hint: 'React + FastAPI + PostgreSQL' },
  { id: 'ai-data', label: 'AI & Data', hint: 'Language models and data processing' },
];

export const categoryLabels: ProjectCategory[] = [
  'Security Analysis',
  'Network Analysis',
  'Threat Intelligence',
  'Security Operations',
  'Software Security',
  'Asset Monitoring',
  'Cybersecurity Education',
  'Full-Stack Engineering',
  'Data Processing',
  'Learning Technology',
  'AI Engineering',
];

export const technicalFocus = [
  {
    title: 'Python & Backend Engineering',
    body: 'FastAPI services, Pydantic validation, SQLAlchemy models, Alembic migrations, background jobs and modular analysis engines.',
    to: '/projects?filter=full-stack',
  },
  {
    title: 'Full-Stack Application Development',
    body: 'React and TypeScript frontends talking to typed Python APIs, with real loading, empty, error and success states.',
    to: '/projects?filter=full-stack',
  },
  {
    title: 'Defensive Cybersecurity',
    body: 'Phishing and URL analysis, packet-capture inspection, threat-intelligence handling, incident workflow, exposure monitoring.',
    to: '/projects?filter=cybersecurity',
  },
  {
    title: 'Data Processing & Analysis',
    body: 'Parsing messy inputs, normalising records, deduplicating, aggregating and visualising the result without losing provenance.',
    to: '/projects?filter=ai-data',
  },
  {
    title: 'Secure Software Practices',
    body: 'Server-side authorisation, input validation, safe file handling, SSRF and path-traversal controls, secret hygiene.',
    to: '/projects?filter=application-security',
  },
  {
    title: 'Automation & Tool Integration',
    body: 'Wrapping established tools — Scapy, Bandit, reputation and intelligence APIs — behind modular, replaceable adapters.',
    to: '/projects?filter=developer-tools',
  },
];

export const engineeringProcess = [
  {
    stage: 'Understand',
    body: 'Identify the problem, its users, constraints and expected outcomes before writing code. Most of my projects start as a question I cannot yet answer.',
  },
  {
    stage: 'Design',
    body: 'Define the data model, module boundaries, API contract and the important workflows. Decide early what stays replaceable.',
  },
  {
    stage: 'Build',
    body: 'Implement in modular, maintainable components. Keep retrieval, parsing, analysis, storage and presentation separated.',
  },
  {
    stage: 'Test',
    body: 'Verify core behaviour with automated tests, exercise edge cases and malformed input, and check authorisation boundaries explicitly.',
  },
  {
    stage: 'Improve',
    body: 'Use test results, real usage and honest reflection to refine the solution — and to write down what the trade-offs cost.',
  },
];
