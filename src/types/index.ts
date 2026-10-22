/**
 * Shared types for the portfolio.
 *
 * The project catalogue in `src/data/projects/` is typed with these
 * interfaces, and every page/component renders from that single source of
 * truth — cards, filters, home-page showcases and case studies all read the
 * same records.
 */

export type ProjectStatus = 'completed' | 'in-progress' | 'archived';

/** Visual scope for a rendered section. See `src/styles/index.css`. */
export type SectionTone = 'surface' | 'quiet' | 'contrast';

export type ProjectSlug =
  | 'learnbridge'
  | 'classconnect'
  | 'tutorspring'
  | 'pathwise'
  | 'teachcraft'
  | 'openlearn-commons'
  | 'learnpulse'
  | 'reachlearn'
  | 'eduaccess'
  | 'workniche';

export interface ProjectFeature {
  /** Short feature name shown as a heading in the case study. */
  title: string;
  /** What the feature does. */
  description: string;
  /** Why it matters for learners, teachers or programs. */
  importance?: string;
}

/**
 * A view inside a project's interface gallery.
 *
 * No real application screenshots exist yet, so every entry is an
 * *illustrative* preview drawn from the site's own component system and
 * labelled as such in the UI — never presented as a screenshot of running
 * software. When a genuine screenshot is captured, set `screenshotSrc` to the
 * file in `public/screenshots/<slug>/…` and the gallery renders the image
 * instead, keeping `isIllustrative` honest per entry.
 */
export interface ProjectPreview {
  id: string;
  /** View key understood by the project's visual component. */
  view: PreviewView;
  /** Real screenshot path. Takes precedence over the illustrative preview. */
  screenshotSrc?: string;
  alt: string;
  caption: string;
  isIllustrative: boolean;
}

export type PreviewView = 'primary' | 'detail';

/** Which layer of a system an architecture node belongs to. */
export type ArchitectureLayer =
  'client' | 'api' | 'domain' | 'data' | 'integration' | 'worker' | 'ai';

export interface ArchitectureNode {
  id: string;
  label: string;
  description?: string;
  layer: ArchitectureLayer;
  /** Ids of downstream nodes. Rendered as a text-described flow. */
  connectsTo?: string[];
}

export interface EngineeringDecision {
  title: string;
  description: string;
}

export interface WorkflowStep {
  title: string;
  description: string;
}

export interface CaseStudy {
  /** The concrete learning or workflow problem. */
  problem: string;
  /** Verified/intended users of the application. */
  users: string[];
  /** Constraints that shaped the implementation. */
  constraints: string[];
  /** Primary workflow, in order. */
  workflow: WorkflowStep[];
  /** Product-specific engineering decisions. */
  engineeringDecisions: EngineeringDecision[];
  /** Behaviours covered by the project's own test suite. */
  testing: string[];
  /** Honest limits of the current implementation. */
  limitations: string[];
  /** Explicitly not implemented yet. */
  futureImprovements: string[];
}

export interface PortfolioProject {
  id: string;
  slug: ProjectSlug;
  name: string;
  /** One-line value proposition used on cards and in metadata. */
  shortDescription: string;
  /** Longer framing used at the top of the case study. */
  longDescription: string;
  primaryCategory: string;
  /** Filter category ids — must exist in `src/data/categories.ts`. */
  categories: string[];
  technologies: string[];
  /** Short searchable tags shown on cards (3–5 per project). */
  featureTags: string[];
  features: ProjectFeature[];
  /** Label for the visual, e.g. "Illustrative learner-dashboard preview". */
  visualLabel: string;
  previews: ProjectPreview[];
  architecture: ArchitectureNode[];
  caseStudy: CaseStudy;
  /** Only rendered when configured in `src/config/deployment.ts`. */
  liveDemoUrl?: string;
  repositoryUrl?: string;
  featured: boolean;
  status: ProjectStatus;
  displayOrder: number;
  /** Only set when a genuine date is known — never invented. */
  projectDate?: string;
  relatedSlugs: ProjectSlug[];
  /** Short note about what a visitor needs to run the demo themselves. */
  demoRequirements?: string;
}

/**
 * Deployment details connected to a project once the application and its
 * source repository exist. Kept in `src/config/deployment.ts`.
 */
export interface DeploymentDetails {
  liveDemoUrl?: string;
  repositoryUrl?: string;
  /** Non-sensitive, resettable demo access note (never real credentials). */
  demoNote?: string;
  /** Free-text status, e.g. "repository published, deployment pending". */
  note?: string;
}

export type DeploymentRegistry = Partial<
  Record<ProjectSlug, DeploymentDetails>
>;

/** A project record merged with its connected deployment details. */
export type ConnectedProject = PortfolioProject;

export interface CategoryDefinition {
  id: string;
  label: string;
  description: string;
  /** Groups the filter bar into "domains", "technologies" and "practices". */
  group: 'domain' | 'technology' | 'practice';
}

export interface ExternalLink {
  id: string;
  label: string;
  url: string;
  /** Where the link is presented. */
  kind: 'profile' | 'contact' | 'demo' | 'repository';
}

export interface SkillGroup {
  id: string;
  title: string;
  summary: string;
  items: string[];
  /** Project slugs that evidence this group. */
  evidenceSlugs: ProjectSlug[];
  /** Optional note clarifying what the evidence does and does not show. */
  caveat?: string;
}

export interface JourneyTheme {
  id: string;
  title: string;
  description: string;
  slugs: ProjectSlug[];
  focusPoints: string[];
}

export interface ApproachStage {
  id: string;
  title: string;
  summary: string;
  practices: string[];
  artefacts: string[];
}

export interface Principle {
  id: string;
  title: string;
  description: string;
}

export interface FocusArea {
  id: string;
  title: string;
  description: string;
  /** Category id used to link into the filtered project library. */
  categoryId?: string;
  /** Project that carries this domain, used when no single category fits. */
  projectSlug?: ProjectSlug;
}
