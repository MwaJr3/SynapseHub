import { Link } from 'react-router-dom';
import { featuredProjects } from '@/data/projects';
import { ProjectVisual } from '@/components/visuals/ProjectVisual';
import { TagList } from '@/components/ui/TagList';
import { ProjectExternalActions } from '@/components/projects/ProjectExternalActions';
import { categoryLabels } from '@/data/categories';
import { cn } from '@/lib/cn';

/**
 * Four featured projects, alternating sides on wide screens so each one gets a
 * full-size composition. Live demo and source buttons only appear when a URL is
 * configured in the deployment registry.
 */
export function FeaturedProjects() {
  return (
    <div className="grid gap-10">
      {featuredProjects.map((project, index) => (
        <article
          key={project.slug}
          className={cn(
            'grid gap-6 rounded-card border border-line bg-panel p-5 sm:p-6 lg:grid-cols-2 lg:items-center lg:gap-10',
          )}
        >
          <div className={cn(index % 2 === 1 && 'lg:order-2')}>
            <ProjectVisual slug={project.slug} view="primary" />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">
                {categoryLabels[project.categories[0] ?? ''] ??
                  project.primaryCategory}
              </span>
              <span className="chip border-accent/40 text-accent">
                Featured
              </span>
            </div>

            <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
              <Link
                to={`/projects/${project.slug}`}
                className="hover:text-accent"
              >
                {project.name}
              </Link>
            </h3>
            <p className="mono-meta">{project.primaryCategory}</p>
            <p className="prose-body text-sm sm:text-base">
              {project.shortDescription}
            </p>

            <div>
              <p className="eyebrow mb-2">Built for</p>
              <p className="prose-body text-sm">
                {project.caseStudy.users.slice(0, 2).join(' · ')}
              </p>
            </div>

            <TagList
              tags={project.technologies}
              label={`${project.name} technologies`}
              limit={5}
            />

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                to={`/projects/${project.slug}`}
                className="btn btn-primary px-3.5 py-2 text-sm"
              >
                View case study
              </Link>
              <ProjectExternalActions project={project} size="sm" />
              {!project.liveDemoUrl && !project.repositoryUrl && (
                <span className="mono-meta">
                  Demo and source not connected yet
                </span>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
