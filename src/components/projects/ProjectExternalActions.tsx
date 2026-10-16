import type { PortfolioProject } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface ProjectExternalActionsProps {
  project: PortfolioProject;
  className?: string;
  size?: 'md' | 'sm';
}

/**
 * Live demo and source-code actions.
 *
 * An action is only rendered when its URL is configured (and passes URL
 * validation). There are no disabled placeholder buttons and no fallback
 * destination: if a link is missing, the case study simply explains that it
 * has not been connected yet.
 */
export function ProjectExternalActions({
  project,
  className,
  size = 'md',
}: ProjectExternalActionsProps) {
  if (!project.liveDemoUrl && !project.repositoryUrl) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {project.liveDemoUrl && (
        <Button
          href={project.liveDemoUrl}
          variant="primary"
          size={size}
          icon={<ArrowUpRightIcon />}
        >
          Live demo
        </Button>
      )}
      {project.repositoryUrl && (
        <Button
          href={project.repositoryUrl}
          variant="secondary"
          size={size}
          icon={<CodeIcon />}
        >
          Source code
        </Button>
      )}
    </div>
  );
}

export function ArrowUpRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M4 10L10 4M10 4H5.5M10 4V8.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function CodeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M5 3.5L2 7l3 3.5M9 3.5L12 7l-3 3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
