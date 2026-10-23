/**
 * Typed project registry model.
 *
 * Every project on the homepage, in the directory, in filters, in search and
 * on its case-study page is rendered from the *same* record defined here. There
 * is no second, partial copy of a project anywhere in the app.
 */

export type AccentName =
  | 'cyan'
  | 'blue'
  | 'violet'
  | 'amber'
  | 'teal'
  | 'indigo'
  | 'rose'
  | 'green'
  | 'sky';

/** Descriptive categories used on the card and case study. */
export type ProjectCategory =
  | 'Security Analysis'
  | 'Network Analysis'
  | 'Threat Intelligence'
  | 'Security Operations'
  | 'Software Security'
  | 'Developer Tools'
  | 'Asset Monitoring'
  | 'Cybersecurity Education'
  | 'Full-Stack Engineering'
  | 'Data Processing'
  | 'Learning Technology'
  | 'AI Engineering';

/** The filter facets exposed in the project directory. */
export type FilterId =
  | 'all'
  | 'cybersecurity'
  | 'application-security'
  | 'network-analysis'
  | 'security-operations'
  | 'developer-tools'
  | 'education'
  | 'full-stack'
  | 'ai-data';

export interface FeatureItem {
  title: string;
  body: string;
}

export interface ArchitectureLayer {
  layer: string;
  items: string[];
}

export interface Decision {
  title: string;
  context: string;
  decision: string;
  tradeoff: string;
}

export interface TestingItem {
  title: string;
  body: string;
}

export interface Challenge {
  problem: string;
  approach: string;
  reasoning: string;
  lesson: string;
}

export interface DiagramFlow {
  title: string;
  /** Ordered pipeline stages; rendered as a flow diagram. */
  steps: { label: string; detail: string }[];
  caption?: string;
}

export interface PreviewConfig {
  /** Key into the preview component registry (src/components/previews). */
  visual: string;
  /** Alt text / accessible description of the preview artwork. */
  alt: string;
  /** Set when a real screenshot should replace the drawn preview. */
  screenshot?: string;
  screenshotNote?: string;
}

export interface CaseStudy {
  problem: string[];
  whoBenefits: string[];
  objectives: string[];
  solution: string[];
  workflow: DiagramFlow;
  architecture: {
    summary: string;
    layers: ArchitectureLayer[];
    security?: string[];
  };
  decisions: Decision[];
  testing: { summary: string; items: TestingItem[] };
  challenges: Challenge[];
  demonstration: {
    summary: string;
    steps: { title: string; body: string }[];
    accessNote: string;
  };
  limitations: string[];
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  description: string[];
  categories: ProjectCategory[];
  filters: FilterId[];
  tech: string[];
  /** Highlighted on cards; the fuller list lives in `tech`. */
  keyTech: string[];
  featured: boolean;
  /** Lower number sorts first in "curated" order. */
  order: number;
  status: string;
  year: string;
  role: string;
  accent: AccentName;
  capabilities: string[];
  features: FeatureItem[];
  demonstrates: string[];
  caseStudyFocus: string;
  visualDirection: string;
  preview: PreviewConfig;
  /** Empty string = not configured. The UI hides the action instead of
   *  linking somewhere fabricated. */
  liveUrl: string;
  repoUrl: string;
  caseStudy: CaseStudy;
  /** Set true where a section needs the author's own verified numbers or
   *  anecdotes before publication. Surfaced in the editing docs. */
  needsAuthorReview?: string[];
}
