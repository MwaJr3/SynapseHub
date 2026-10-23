import { Link } from 'react-router-dom';
import type { Project } from '@/types/project';
import { cn } from '@/lib/cn';
import { isUsableLink } from '@/lib/links';
import { Icon } from '@/components/ui/Icon';
import { TechTag } from '@/components/ui/Badge';
import { ProjectVisual } from './ProjectVisual';

export interface ProjectCardProps {
  project: Project;
  /** `compact` hides the capability list — used in the homepage highlight row. */
  variant?: 'full' | 'compact';
  className?: string;
}

/**
 * Project card.
 *
 * Accessibility approach: the card title is the real link (so screen readers
 * and keyboard users get one clear target), while the card surface provides a
 * large click area via a stretched pseudo-element. The demo and source links
 * stay separate, focusable controls layered above it — nothing is nested
 * inside an anchor, and no link is blocked.
 */
export function ProjectCard({ project, variant = 'full', className }: ProjectCardProps) {
  const hasLive = isUsableLink(project.liveUrl);
  const hasRepo = isUsableLink(project.repoUrl);

  return (
    <article
      data-accent={project.accent}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface',
        'card-interactive',
        className,
      )}
    >
      <Link
        to={`/projects/${project.slug}`}
        className="absolute inset-0 z-10 rounded-xl"
        aria-label={`${project.name} — open case study`}
      >
        <span className="sr-only">{project.summary}</span>
      </Link>

      <div className="relative aspect-[8/5] w-full overflow-hidden border-b border-line">
        <ProjectVisual project={project} className="h-full w-full" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[var(--prj-soft)] px-2 py-0.5 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-[var(--prj)]">
            {project.categories[0]}
          </span>
          {project.categories.slice(1, 2).map((category) => (
            <span
              key={category}
              className="rounded-md border border-line px-2 py-0.5 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-fg-subtle"
            >
              {category}
            </span>
          ))}
          <span className="ml-auto font-mono text-[0.68rem] text-fg-subtle">{project.year}</span>
        </div>

        <h3 className="mt-3 text-lg font-semibold tracking-tight text-fg">{project.name}</h3>
        <p className="mt-1 text-sm font-medium text-[var(--prj)]">{project.tagline}</p>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">{project.summary}</p>

        {variant === 'full' ? (
          <ul className="mt-4 space-y-2">
            {project.capabilities.slice(0, 2).map((capability) => (
              <li key={capability} className="flex gap-2 text-[0.83rem] leading-snug text-fg-muted">
                <Icon name="check" size={14} className="mt-0.5 shrink-0 text-[var(--prj)]" aria-hidden />
                <span>{capability}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.keyTech.map((tech) => (
            <TechTag key={tech} name={tech} />
          ))}
        </div>

        <div className="relative z-20 mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors group-hover:text-accent-hover">
            Case study
            <Icon
              name="arrow-right"
              size={15}
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>

          <span className="ml-auto flex items-center gap-2">
            {hasLive ? (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-accent-line hover:text-fg"
              >
                <Icon name="external" size={13} aria-hidden />
                Live app
              </a>
            ) : null}
            {hasRepo ? (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-accent-line hover:text-fg"
              >
                <Icon name="github" size={13} aria-hidden />
                Source
              </a>
            ) : null}
          </span>
        </div>
      </div>
    </article>
  );
}
