import type { ProjectSlug, PreviewView } from '@/types';
import { LearnBridgeVisual } from './learnbridge-visual';
import { ClassConnectVisual } from './classconnect-visual';
import { TutorSpringVisual } from './tutorspring-visual';
import { PathWiseVisual } from './pathwise-visual';
import { TeachCraftVisual } from './teachcraft-visual';
import { OpenLearnVisual } from './openlearn-visual';
import { LearnPulseVisual } from './learnpulse-visual';
import { ReachLearnVisual } from './reachlearn-visual';
import { EduAccessVisual } from './eduaccess-visual';
import { WorkNicheVisual } from './workniche-visual';

interface ProjectVisualProps {
  slug: ProjectSlug;
  view?: PreviewView;
  /** Cropped variant for cards; see `VisualFrame`. */
  compact?: boolean;
}

/**
 * Renders a project's illustrative preview.
 *
 * Each project has its own composition and colour accent so a card is
 * recognisable without reading its title, and every one carries the
 * "Illustrative preview" badge from `VisualFrame`.
 */
export function ProjectVisual({
  slug,
  view = 'primary',
  compact = false,
}: ProjectVisualProps) {
  switch (slug) {
    case 'learnbridge':
      return <LearnBridgeVisual view={view} compact={compact} />;
    case 'classconnect':
      return <ClassConnectVisual view={view} compact={compact} />;
    case 'tutorspring':
      return <TutorSpringVisual view={view} compact={compact} />;
    case 'pathwise':
      return <PathWiseVisual view={view} compact={compact} />;
    case 'teachcraft':
      return <TeachCraftVisual view={view} compact={compact} />;
    case 'openlearn-commons':
      return <OpenLearnVisual view={view} compact={compact} />;
    case 'learnpulse':
      return <LearnPulseVisual view={view} compact={compact} />;
    case 'reachlearn':
      return <ReachLearnVisual view={view} compact={compact} />;
    case 'eduaccess':
      return <EduAccessVisual view={view} compact={compact} />;
    case 'workniche':
      return <WorkNicheVisual view={view} compact={compact} />;
    default: {
      // Exhaustiveness guard: adding a slug without a visual is a type error.
      const exhaustive: never = slug;
      return exhaustive;
    }
  }
}
