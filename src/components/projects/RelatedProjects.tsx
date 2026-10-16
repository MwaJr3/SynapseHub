import { Link } from 'react-router-dom';
import type { PortfolioProject } from '@/types';
import { getRelatedProjects } from '@/data/projects';
import { TagList } from '@/components/ui/TagList';

interface RelatedProjectsProps {
  project: PortfolioProject;
}

/**
 * Related projects, selected from the shared category tags in the catalogue
 * rather than a hand-maintained list buried in a component.
 */
export function RelatedProjects({ project }: RelatedProjectsProps) {
  const related = getRelatedProjects(project);
  if (related.length === 0) return null;

  const shared = (candidate: PortfolioProject) =>
    candidate.categories.filter((category) =>
      project.categories.includes(category),
    );

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {related.map((candidate) => (
        <li key={candidate.slug}>
          <Link
            to={`/projects/${candidate.slug}`}
            className="card card-interactive flex h-full flex-col gap-3 p-5 focus-visible:outline-none"
          >
            <p className="mono-meta">{candidate.primaryCategory}</p>
            <p className="text-base font-semibold text-ink">{candidate.name}</p>
            <p className="prose-body text-sm">{candidate.shortDescription}</p>
            <TagList
              tags={shared(candidate)}
              label={`Categories shared with ${project.name}`}
              limit={3}
              className="mt-auto pt-2"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
