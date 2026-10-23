import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { projects } from '@/data/projects';
import { profile } from '@/config/profile';
import { usePageMeta } from '@/lib/seo';
import { Container, Section } from '@/components/ui/Layout';
import { LinkButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { AccentScope } from '@/components/project/AccentScope';

/**
 * 404. Also reused for an unknown project slug, where `reason` and
 * `suggestion` explain what happened and offer the real routes.
 */
export default function NotFoundPage({
  reason,
  suggestion,
}: {
  reason?: string | undefined;
  suggestion?: ReactNode | undefined;
} = {}) {
  const location = useLocation();

  usePageMeta({
    title: `Page not found — ${profile.name}`,
    description: 'The requested page does not exist in this portfolio.',
  });

  return (
    <Section tone="light">
      <Container className="py-20 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <p className="font-mono text-sm text-accent">404</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            That page isn&apos;t part of this portfolio
          </h1>
          <p className="mt-4 text-base leading-relaxed text-fg-muted">
            {reason ?? (
              <>
                Nothing is routed at{' '}
                <code className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-sm text-fg">
                  {location.pathname}
                </code>
                . It may be an old link, or a typo in the address.
              </>
            )}
          </p>

          {suggestion}

          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/projects" variant="primary" icon="layers">
              Browse all {projects.length} projects
            </LinkButton>
            <LinkButton to="/" variant="outline" icon="arrow-left">
              Back to the homepage
            </LinkButton>
          </div>

          <div className="mt-12 border-t border-line pt-8">
            <h2 className="eyebrow mb-4">Valid project routes</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {projects.map((project) => (
                <li key={project.slug}>
                  <AccentScope accent={project.accent}>
                    <Link
                      to={`/projects/${project.slug}`}
                      className="group flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-2.5 transition-colors hover:border-[var(--prj-line)]"
                    >
                      <span aria-hidden className="size-2 shrink-0 rounded-full bg-[var(--prj)]" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{project.name}</span>
                      <code className="hidden shrink-0 font-mono text-[0.7rem] text-fg-subtle sm:inline">
                        /projects/{project.slug}
                      </code>
                      <Icon
                        name="arrow-up-right"
                        size={14}
                        aria-hidden
                        className="shrink-0 text-fg-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </Link>
                  </AccentScope>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  );
}
