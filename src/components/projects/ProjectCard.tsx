import { Link } from 'react-router-dom';
import type { PortfolioProject } from '@/types';
import { categoryLabels } from '@/data/categories';
import { ProjectVisual } from '@/components/visuals/ProjectVisual';
import { TagList } from '@/components/ui/TagList';
import { ProjectExternalActions } from './ProjectExternalActions';
import { cn } from '@/lib/cn';

interface ProjectCardProps {
  project: PortfolioProject;
  className?: string;
  /** Featured cards show the full composition; library cards crop it. */
  variant?: 'library' | 'featured';
}

export function ProjectCard({
  project,
  className,
  variant = 'library',
}: ProjectCardProps) {
  const primaryCategory =
    categoryLabels[project.categories[0] ?? ''] ?? project.primaryCategory;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-card border border-line bg-panel transition-[border-color,box-shadow,transform] duration-300 ease-out-soft hover:-translate-y-1 hover:border-line-strong hover:shadow-lift',
        className,
      )}
    >
      <div className="border-b border-line bg-panel-strong p-3">
        <ProjectVisual slug={project.slug} view="primary" compact />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{primaryCategory}</span>
          {project.featured && (
            <span className="chip border-accent/40 text-accent">Featured</span>
          )}
          <span className="chip">
            {project.liveDemoUrl
              ? 'Demo connected'
              : project.repositoryUrl
                ? 'Source connected'
                : 'Catalogue first'}
          </span>
        </div>

        <div>
          <h3 className="text-lg font-semibold tracking-tight text-ink">
            {/* Stretched link: the whole card opens the case study, and external
                actions below sit above it so they stay independently clickable. */}
            <Link
              to={`/projects/${project.slug}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {project.name}
            </Link>
          </h3>
          <p className="mono-meta mt-1">{project.primaryCategory}</p>
        </div>

        <p className="prose-body text-sm">{project.shortDescription}</p>

        <TagList
          tags={project.featureTags}
          label={`${project.name} feature highlights`}
          limit={4}
        />

        <div className="mt-auto space-y-4 pt-2">
          <TagList
            tags={project.technologies}
            label={`${project.name} technologies`}
            limit={5}
            tone="plain"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/projects/${project.slug}`}
              className="link-inline relative z-10 text-sm"
            >
              View case study
            </Link>
            <ProjectExternalActions
              project={project}
              size="sm"
              className="relative z-10"
            />
            {!project.liveDemoUrl && !project.repositoryUrl && (
              <span className="mono-meta">
                Application and source not yet connected
              </span>
            )}
          </div>
        </div>
      </div>

      {variant === 'featured' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-accent/40"
        />
      )}
    </article>
  );
}
