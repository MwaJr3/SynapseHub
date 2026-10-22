import { Link } from 'react-router-dom';
import { focusAreas } from '@/data/focus-areas';
import { projects } from '@/data/projects';
import { categoryLabels } from '@/data/categories';
import { countLabel } from '@/lib/format';

/**
 * The domains represented by the portfolio. Each card links to a real
 * filter in the library (or the project that carries the domain), so the
 * overview is navigable rather than decorative.
 */
export function FocusAreaGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {focusAreas.map((area, index) => {
        const count = area.categoryId
          ? projects.filter((project) =>
              project.categories.includes(area.categoryId as string),
            ).length
          : 1;
        const href = area.categoryId
          ? `/projects?category=${area.categoryId}`
          : `/projects/${area.projectSlug}`;
        const linkText = area.categoryId
          ? 'Open filtered library'
          : 'Open case study';
        const meta = area.categoryId
          ? `${countLabel(count)} in ${categoryLabels[area.categoryId] ?? 'this domain'}`
          : `Case study: ${projects.find((project) => project.slug === area.projectSlug)?.name ?? ''}`;

        return (
          <li key={area.id}>
            <Link
              to={href}
              className="card card-interactive group flex h-full flex-col gap-3 p-5"
            >
              <span className="mono-meta">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-base font-semibold tracking-tight text-ink">
                {area.title}
              </span>
              <span className="prose-body text-sm">{area.description}</span>
              <span className="mt-auto pt-3 text-xs text-ink-subtle">
                {meta}
                <span className="mono-meta mt-1 block text-accent group-hover:underline">
                  {linkText} →
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
